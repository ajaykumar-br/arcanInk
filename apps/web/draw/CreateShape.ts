import { Tool } from "@/components/Canvas";
import getStroke from "perfect-freehand";
import type { Theme } from "@/components/ThemeProvider";
import { getExistingShapes } from "./http";

export type Point = { x: number; y: number; pressure?: number };

export type ShapeParams =
  | { x: number; y: number; width: number; height: number }
  | { x1: number; x2: number; y1: number; y2: number }
  | { x: number; y: number; radius: number }
  | { points: Point[]; size?: number }
  | { x: number; y: number; text: string; fontSize: number };

export type Shape = {
  id?: number | string;
  clientId?: string; // set on shapes drawn locally until the server echo assigns an id
  shape: Tool;
  shapeParams: ShapeParams;
};

type Bounds = { x: number; y: number; w: number; h: number };

// One entry per user action; undo/redo replay these through the same socket messages.
type HistoryAction =
  | { kind: "add"; shape: Shape }
  | { kind: "erase"; shapes: Shape[] }
  | { kind: "update"; shape: Shape; before: ShapeParams; after: ShapeParams };

const THEME_COLORS: Record<Theme, { background: string; ink: string }> = {
  dark: { background: "#232329", ink: "#ffffff" },
  light: { background: "#ffffff", ink: "#1b1b1f" },
};

const SELECTION_COLOR = "#4f8cff";
const FREEHAND_SIZE = 4;
const TEXT_SIZE = 20;
const TEXT_LINE_HEIGHT = 1.25;
const TEXT_FONT = "sans-serif";
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const DRAWING_TOOLS: Tool[] = ["RECT", "CIRCLE", "LINE", "ARROW", "PENCIL", "FREEHAND"];

export class CreateShape {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[] = [];
  private roomId: string;
  private selectedTool: Tool = "SELECT";
  private theme: Theme = "dark";

  // view transform: screen = world * scale + offset
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  // pointer interaction state
  private mode: "idle" | "draw" | "pan" | "move" | "erase" = "idle";
  private activePointerId: number | null = null;
  private start: Point = { x: 0, y: 0 };
  private lastScreen = { x: 0, y: 0 };
  private current: Point = { x: 0, y: 0 };
  private points: Point[] = []; // pencil / freehand points
  private usesRealPressure = false;

  // selection / move
  private selected: Shape | null = null;
  private moveBefore: ShapeParams | null = null;

  // eraser
  private erasedThisStroke: Shape[] = [];

  // text editing
  private editor: HTMLTextAreaElement | null = null;

  // history
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  // shapes undone before the server echoed their id; the echo must delete them rather than add them
  private cancelledClientIds = new Set<string>();

  socket: WebSocket;
  onViewChange?: (scale: number) => void;

  constructor(canvas: HTMLCanvasElement, socket: WebSocket, roomId: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.roomId = roomId;
    this.socket = socket;
    this.resize();
    this.init(); // load existing shapes
    this.initHandlers(); // socket messages
    this.initDomHandlers();
  }

  // ---------------------------------------------------------------- lifecycle

  destroy() {
    this.closeEditor(false);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("dblclick", this.onDoubleClick);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("resize", this.onResize);
    this.socket.onmessage = null;
  }

  setTool(tool: Tool) {
    this.selectedTool = tool;
    if (tool !== "SELECT") this.selected = null;
    this.canvas.style.cursor = tool === "SELECT" ? "default" : tool === "TEXT" ? "text" : "crosshair";
    this.reDraw();
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.reDraw();
  }

  private get ink() {
    return THEME_COLORS[this.theme].ink;
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private onResize = () => {
    this.resize();
    this.reDraw();
  };

  async init() {
    const fetched = await getExistingShapes(this.roomId);
    // Shapes can arrive over the socket (or be drawn) while the request is in flight; keep them.
    const known = new Set(fetched.map((s) => String(s.id)));
    const arrivedMeanwhile = this.existingShapes.filter((s) => s.id === undefined || !known.has(String(s.id)));
    this.existingShapes = [...fetched, ...arrivedMeanwhile];
    this.reDraw();
  }

  private send(payload: object) {
    if (this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  // ------------------------------------------------------------ server events

  initHandlers() {
    this.socket.onmessage = (e) => {
      const message = JSON.parse(e.data);
      if (message.type == "chat") {
        const parsedShape: Shape = {
          id: message.id,
          shape: message.shape,
          shapeParams: JSON.parse(message.shapeParams),
        };
        if (message.clientId && this.cancelledClientIds.delete(message.clientId)) {
          // undone before the server answered: remove the now-persisted copy
          this.send({ type: "erase", shapeIds: [message.id], roomId: this.roomId });
          return;
        }
        // our own shape coming back: give the local copy its server id instead of drawing it twice
        const local = message.clientId
          ? this.existingShapes.find((s) => s.clientId === message.clientId)
          : undefined;
        if (local) {
          local.id = message.id;
          delete local.clientId;
        } else if (!this.existingShapes.some((s) => s.id !== undefined && String(s.id) === String(message.id))) {
          this.existingShapes.push(parsedShape);
        }
        this.reDraw();
      } else if (message.type == "erase") {
        const erased = new Set<string>((message.shapeIds as (number | string)[]).map(String));
        this.existingShapes = this.existingShapes.filter((s) => s.id === undefined || !erased.has(String(s.id)));
        if (this.selected && this.selected.id !== undefined && erased.has(String(this.selected.id))) {
          this.selected = null;
        }
        this.reDraw();
      } else if (message.type == "update") {
        const target = this.existingShapes.find((s) => s.id !== undefined && String(s.id) === String(message.id));
        if (target && target !== this.draggedShape()) {
          target.shapeParams = JSON.parse(message.shapeParams);
          this.reDraw();
        }
      } else if (message.type == "error") {
        console.error("Server error:", message.message);
      }
    };
  }

  private draggedShape() {
    return this.mode === "move" ? this.selected : null;
  }

  // ------------------------------------------------- shape mutations + history

  // The three primitives below are the only places that touch both local state and the socket.
  private addShape(source: Shape): Shape {
    const shape: Shape = {
      shape: source.shape,
      shapeParams: source.shapeParams,
      clientId: crypto.randomUUID(),
    };
    this.existingShapes.push(shape);
    this.send({
      type: "chat",
      shape: shape.shape,
      shapeParams: JSON.stringify(shape.shapeParams),
      roomId: this.roomId,
      clientId: shape.clientId,
    });
    this.reDraw();
    return shape;
  }

  private removeShape(shape: Shape) {
    this.existingShapes = this.existingShapes.filter((s) => s !== shape);
    if (this.selected === shape) this.selected = null;
    if (shape.id !== undefined) {
      this.send({ type: "erase", shapeIds: [shape.id], roomId: this.roomId });
    } else if (shape.clientId) {
      this.cancelledClientIds.add(shape.clientId);
    }
    this.reDraw();
  }

  private updateShape(shape: Shape, params: ShapeParams) {
    shape.shapeParams = params;
    if (shape.id !== undefined) {
      this.send({ type: "update", id: shape.id, shapeParams: JSON.stringify(params), roomId: this.roomId });
    }
    this.reDraw();
  }

  private record(action: HistoryAction) {
    this.undoStack.push(action);
    this.redoStack = [];
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) return;
    if (action.kind === "add") this.removeShape(action.shape);
    else if (action.kind === "erase") action.shapes = action.shapes.map((s) => this.addShape(s));
    else this.updateShape(action.shape, action.before);
    this.redoStack.push(action);
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return;
    if (action.kind === "add") action.shape = this.addShape(action.shape);
    else if (action.kind === "erase") action.shapes.forEach((s) => this.removeShape(s));
    else this.updateShape(action.shape, action.after);
    this.undoStack.push(action);
  }

  private deleteSelected() {
    const shape = this.selected;
    if (!shape) return;
    this.removeShape(shape);
    this.record({ kind: "erase", shapes: [shape] });
  }

  // ------------------------------------------------------------------- zoom

  private setView(scale: number, anchorX: number, anchorY: number) {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    // keep the world point under the anchor (screen coords) fixed while scaling
    const worldX = (anchorX - this.offsetX) / this.scale;
    const worldY = (anchorY - this.offsetY) / this.scale;
    this.scale = next;
    this.offsetX = anchorX - worldX * next;
    this.offsetY = anchorY - worldY * next;
    this.onViewChange?.(next);
    this.reDraw();
  }

  zoomBy(factor: number) {
    this.setView(this.scale * factor, this.canvas.width / 2, this.canvas.height / 2);
  }

  resetZoom() {
    this.setView(1, this.canvas.width / 2, this.canvas.height / 2);
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // pinch gestures and ctrl/cmd + wheel both arrive with ctrlKey/metaKey set
      const rect = this.canvas.getBoundingClientRect();
      this.setView(this.scale * Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
    } else {
      this.offsetX -= e.deltaX;
      this.offsetY -= e.deltaY;
      this.reDraw();
    }
  };

  private toWorld(e: { clientX: number; clientY: number }): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.offsetX) / this.scale,
      y: (e.clientY - rect.top - this.offsetY) / this.scale,
    };
  }

  // -------------------------------------------------------------- rendering

  reDraw() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = THEME_COLORS[this.theme].background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

    this.existingShapes.forEach((shape) => {
      // a shape being edited in the text box is hidden so it doesn't draw twice
      if (this.editor && shape === this.editingShape) return;
      this.drawShape(shape);
    });

    if (this.selected && !this.editor) this.drawSelection(this.selected);
  }

  private drawShape(shape: Shape, complete = true) {
    const ctx = this.ctx;
    const { shape: tool, shapeParams: sp } = shape;
    ctx.strokeStyle = this.ink;
    ctx.fillStyle = this.ink;
    ctx.lineWidth = 1;

    if (tool === "RECT" && "width" in sp) {
      ctx.strokeRect(sp.x, sp.y, sp.width, sp.height);
    } else if (tool === "CIRCLE" && "radius" in sp) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === "LINE" && "x2" in sp) {
      ctx.beginPath();
      ctx.moveTo(sp.x1, sp.y1);
      ctx.lineTo(sp.x2, sp.y2);
      ctx.stroke();
    } else if (tool === "ARROW" && "x2" in sp) {
      const arrowLength = 10;
      const angle = Math.atan2(sp.y2 - sp.y1, sp.x2 - sp.x1);
      ctx.beginPath();
      ctx.moveTo(sp.x1, sp.y1);
      ctx.lineTo(sp.x2, sp.y2);
      ctx.lineTo(sp.x2 - arrowLength * Math.cos(angle - Math.PI / 6), sp.y2 - arrowLength * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(sp.x2, sp.y2);
      ctx.lineTo(sp.x2 - arrowLength * Math.cos(angle + Math.PI / 6), sp.y2 - arrowLength * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (tool === "PENCIL" && "points" in sp) {
      const [first, ...rest] = sp.points;
      if (!first || rest.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      rest.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (tool === "FREEHAND" && "points" in sp) {
      this.drawFreehand(sp.points, sp.size, complete);
    } else if (tool === "TEXT" && "text" in sp) {
      ctx.font = `${sp.fontSize}px ${TEXT_FONT}`;
      ctx.textBaseline = "top";
      sp.text.split("\n").forEach((line, i) => {
        ctx.fillText(line, sp.x, sp.y + i * sp.fontSize * TEXT_LINE_HEIGHT);
      });
    }
  }

  // Smoothed, pressure-aware outline of a stroke rendered as a filled path.
  private drawFreehand(points: Point[], size = FREEHAND_SIZE, complete = true) {
    if (points.length === 0) return;
    const hasPressure = points.some((p) => p.pressure !== undefined);
    const outline = getStroke(
      points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
      { size, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: !hasPressure, last: complete }
    );
    if (outline.length < 2) return;
    const path = new Path2D();
    const first = outline[0]!;
    path.moveTo(first[0]!, first[1]!);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!;
      const b = outline[(i + 1) % outline.length]!;
      path.quadraticCurveTo(a[0]!, a[1]!, (a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2);
    }
    path.closePath();
    this.ctx.fillStyle = this.ink;
    this.ctx.fill(path);
  }

  private drawSelection(shape: Shape) {
    const b = this.getBounds(shape);
    if (!b) return;
    const pad = 6 / this.scale;
    this.ctx.save();
    this.ctx.strokeStyle = SELECTION_COLOR;
    this.ctx.lineWidth = 1 / this.scale;
    this.ctx.setLineDash([5 / this.scale, 4 / this.scale]);
    this.ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
    this.ctx.restore();
  }

  // ------------------------------------------------------ geometry / hit-test

  private measureText(sp: { text: string; fontSize: number }) {
    this.ctx.save();
    this.ctx.font = `${sp.fontSize}px ${TEXT_FONT}`;
    const lines = sp.text.split("\n");
    const w = Math.max(...lines.map((l) => this.ctx.measureText(l).width));
    this.ctx.restore();
    return { w, h: lines.length * sp.fontSize * TEXT_LINE_HEIGHT };
  }

  private getBounds(shape: Shape): Bounds | null {
    const sp = shape.shapeParams;
    if ("width" in sp) {
      return { x: Math.min(sp.x, sp.x + sp.width), y: Math.min(sp.y, sp.y + sp.height), w: Math.abs(sp.width), h: Math.abs(sp.height) };
    }
    if ("radius" in sp) return { x: sp.x - sp.radius, y: sp.y - sp.radius, w: sp.radius * 2, h: sp.radius * 2 };
    if ("x2" in sp) {
      return { x: Math.min(sp.x1, sp.x2), y: Math.min(sp.y1, sp.y2), w: Math.abs(sp.x2 - sp.x1), h: Math.abs(sp.y2 - sp.y1) };
    }
    if ("points" in sp) {
      if (sp.points.length === 0) return null;
      const xs = sp.points.map((p) => p.x);
      const ys = sp.points.map((p) => p.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    if ("text" in sp) return { x: sp.x, y: sp.y, ...this.measureText(sp) };
    return null;
  }

  private translate(sp: ShapeParams, dx: number, dy: number): ShapeParams {
    if ("width" in sp || "radius" in sp) return { ...sp, x: sp.x + dx, y: sp.y + dy };
    if ("x2" in sp) return { x1: sp.x1 + dx, y1: sp.y1 + dy, x2: sp.x2 + dx, y2: sp.y2 + dy };
    if ("points" in sp) return { ...sp, points: sp.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) };
    return { ...sp, x: sp.x + dx, y: sp.y + dy };
  }

  distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    const C = x2 - x1;
    const D = y2 - y1;
    const lenSq = C * C + D * D;
    let param = 0;
    if (lenSq !== 0) {
      param = Math.max(0, Math.min(1, ((x - x1) * C + (y - y1) * D) / lenSq));
    }
    return Math.hypot(x - (x1 + param * C), y - (y1 + param * D));
  }

  isPointInShape(x: number, y: number, shape: Shape): boolean {
    const { shape: tool, shapeParams: sp } = shape;
    const buffer = 5 / this.scale;

    if (tool === "RECT" && "width" in sp) {
      const b = this.getBounds(shape)!;
      return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    } else if (tool === "CIRCLE" && "radius" in sp) {
      return Math.hypot(x - sp.x, y - sp.y) <= sp.radius;
    } else if ((tool === "LINE" || tool === "ARROW") && "x2" in sp) {
      return this.distanceToSegment(x, y, sp.x1, sp.y1, sp.x2, sp.y2) <= buffer;
    } else if ((tool === "PENCIL" || tool === "FREEHAND") && "points" in sp) {
      const { points } = sp;
      if (points.length === 1) return Math.hypot(x - points[0]!.x, y - points[0]!.y) <= buffer * 2;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (!p1 || !p2) continue;
        if (this.distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= buffer * 2) return true;
      }
      return false;
    } else if (tool === "TEXT" && "text" in sp) {
      const b = this.getBounds(shape)!;
      return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    }
    return false;
  }

  private hitTest(p: Point): Shape | null {
    for (let i = this.existingShapes.length - 1; i >= 0; i--) {
      const shape = this.existingShapes[i]!;
      if (this.isPointInShape(p.x, p.y, shape)) return shape;
    }
    return null;
  }

  // ------------------------------------------------------- pointer handling

  initDomHandlers() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("dblclick", this.onDoubleClick);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this.onResize);
  }

  // Arrow-function properties keep a stable reference so destroy() can really remove them.
  private onPointerDown = (e: PointerEvent) => {
    if (this.activePointerId !== null || this.editor) return; // ignore extra touches mid-stroke / while typing
    this.activePointerId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);

    const p = this.toWorld(e);
    this.start = p;
    this.current = p;
    this.lastScreen = { x: e.clientX, y: e.clientY };

    // middle mouse button pans with any tool
    if (e.button === 1) {
      this.mode = "pan";
      return;
    }

    const tool = this.selectedTool;
    if (tool === "SELECT") {
      const hit = this.hitTest(p);
      this.selected = hit;
      if (hit) {
        this.mode = "move";
        this.moveBefore = hit.shapeParams;
      } else {
        this.mode = "pan";
      }
      this.reDraw();
    } else if (tool === "TEXT") {
      this.mode = "idle";
      // release the pointer first so the new textarea can take focus on pointerup
      this.openEditor(p, null);
    } else if (tool === "ERASER") {
      this.mode = "erase";
      this.erasedThisStroke = [];
      this.eraseAt(p);
    } else if (DRAWING_TOOLS.includes(tool)) {
      this.mode = "draw";
      if (tool === "PENCIL" || tool === "FREEHAND") {
        // Mouse reports a constant 0.5 pressure, so only trust pens and touch with real values.
        this.usesRealPressure = tool === "FREEHAND" && e.pointerType !== "mouse" && e.pressure > 0;
        this.points = [this.pointFrom(e, p)];
      }
    }
  };

  private pointFrom(e: PointerEvent, world: Point): Point {
    return this.usesRealPressure ? { ...world, pressure: e.pressure } : world;
  }

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return;
    const p = this.toWorld(e);
    this.current = p;

    if (this.mode === "pan") {
      this.offsetX += e.clientX - this.lastScreen.x;
      this.offsetY += e.clientY - this.lastScreen.y;
      this.lastScreen = { x: e.clientX, y: e.clientY };
      this.reDraw();
    } else if (this.mode === "move" && this.selected && this.moveBefore) {
      this.selected.shapeParams = this.translate(this.moveBefore, p.x - this.start.x, p.y - this.start.y);
      this.reDraw();
    } else if (this.mode === "erase") {
      this.eraseAt(p);
    } else if (this.mode === "draw") {
      const tool = this.selectedTool;
      if (tool === "PENCIL" || tool === "FREEHAND") {
        // Coalesced events recover the samples the browser merged, which keeps fast strokes smooth.
        const events = e.getCoalescedEvents?.() ?? [];
        (events.length ? events : [e]).forEach((ev) => this.points.push(this.pointFrom(ev, this.toWorld(ev))));
      }
      this.reDraw();
      const preview = this.buildShape();
      if (preview) this.drawShape(preview, false);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    const mode = this.mode;
    this.mode = "idle";
    const p = this.toWorld(e);
    this.current = p;

    if (mode === "draw") {
      const shape = this.buildShape();
      this.points = [];
      if (!shape) return;
      const added = this.addShape(shape);
      this.record({ kind: "add", shape: added });
    } else if (mode === "move" && this.selected && this.moveBefore) {
      const before = this.moveBefore;
      this.moveBefore = null;
      const moved = Math.hypot(p.x - this.start.x, p.y - this.start.y) > 0;
      if (moved && this.selected.id !== undefined) {
        this.updateShape(this.selected, this.selected.shapeParams);
        this.record({ kind: "update", shape: this.selected, before, after: this.selected.shapeParams });
      } else {
        this.selected.shapeParams = before; // not yet saved on the server (no id), so don't diverge
        this.reDraw();
      }
    } else if (mode === "erase") {
      if (this.erasedThisStroke.length) {
        this.record({ kind: "erase", shapes: this.erasedThisStroke });
      }
      this.erasedThisStroke = [];
      this.reDraw();
    }
  };

  // The shape described by the current drag, used for both the live preview and the final commit.
  private buildShape(): Shape | null {
    const tool = this.selectedTool;
    const { start, current } = this;
    if (tool === "RECT") {
      return { shape: "RECT", shapeParams: { x: start.x, y: start.y, width: current.x - start.x, height: current.y - start.y } };
    } else if (tool === "CIRCLE") {
      return { shape: "CIRCLE", shapeParams: { x: start.x, y: start.y, radius: Math.hypot(current.x - start.x, current.y - start.y) } };
    } else if (tool === "LINE" || tool === "ARROW") {
      return { shape: tool, shapeParams: { x1: start.x, y1: start.y, x2: current.x, y2: current.y } };
    } else if (tool === "PENCIL" && this.points.length > 0) {
      return { shape: "PENCIL", shapeParams: { points: this.points } };
    } else if (tool === "FREEHAND" && this.points.length > 0) {
      return { shape: "FREEHAND", shapeParams: { points: this.points, size: FREEHAND_SIZE } };
    }
    return null;
  }

  private eraseAt(p: Point) {
    const hit = [...this.existingShapes].reverse().filter((s) => s.id !== undefined && this.isPointInShape(p.x, p.y, s));
    if (!hit.length) return;
    const ids = hit.map((s) => s.id!);
    this.existingShapes = this.existingShapes.filter((s) => !hit.includes(s));
    this.erasedThisStroke.push(...hit);
    this.send({ type: "erase", shapeIds: ids, roomId: this.roomId });
    this.reDraw();
  }

  // -------------------------------------------------------------- text input

  private editingShape: Shape | null = null;

  private onDoubleClick = (e: MouseEvent) => {
    if (this.selectedTool !== "SELECT" || this.editor) return;
    const p = this.toWorld(e);
    const hit = this.hitTest(p);
    if (hit && hit.shape === "TEXT") this.openEditor(p, hit);
    else if (!hit) this.openEditor(p, null);
  };

  // existing = the text shape being edited, or null to create a new one at `at`
  private openEditor(at: Point, existing: Shape | null) {
    this.closeEditor(false);
    const sp = existing?.shapeParams;
    const origin = sp && "text" in sp ? { x: sp.x, y: sp.y } : at;
    const fontSize = sp && "text" in sp ? sp.fontSize : TEXT_SIZE;

    this.editingShape = existing;
    this.selected = existing;

    const rect = this.canvas.getBoundingClientRect();
    const area = document.createElement("textarea");
    area.value = sp && "text" in sp ? sp.text : "";
    area.rows = 1;
    area.spellcheck = false;
    area.setAttribute("aria-label", "Text");
    Object.assign(area.style, {
      position: "fixed",
      left: `${rect.left + origin.x * this.scale + this.offsetX}px`,
      top: `${rect.top + origin.y * this.scale + this.offsetY}px`,
      minWidth: "40px",
      font: `${fontSize * this.scale}px ${TEXT_FONT}`,
      lineHeight: `${TEXT_LINE_HEIGHT}`,
      color: this.ink,
      caretColor: this.ink,
      background: "transparent",
      border: "none",
      outline: `1px dashed ${SELECTION_COLOR}`,
      padding: "0",
      margin: "0",
      resize: "none",
      overflow: "hidden",
      whiteSpace: "pre",
      zIndex: "30",
    });

    const fit = () => {
      area.style.height = "auto";
      area.style.width = "40px";
      area.style.height = `${area.scrollHeight}px`;
      area.style.width = `${Math.max(40, area.scrollWidth + 2)}px`;
    };
    area.addEventListener("input", fit);
    area.addEventListener("keydown", (ev) => {
      ev.stopPropagation(); // keep Delete / Ctrl+Z etc. from reaching the canvas shortcuts
      if (ev.key === "Escape") this.closeEditor(false);
      else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) this.closeEditor(true);
    });
    area.addEventListener("blur", () => this.closeEditor(true));

    document.body.appendChild(area);
    this.editor = area;
    this.editorOrigin = origin;
    this.editorFontSize = fontSize;
    this.reDraw(); // hides the shape being edited now that the editor is registered
    fit();
    setTimeout(() => {
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
    }, 0);
  }

  private editorOrigin: Point = { x: 0, y: 0 };
  private editorFontSize = TEXT_SIZE;

  private closeEditor(commit: boolean) {
    const area = this.editor;
    if (!area) return;
    this.editor = null; // first, so the blur fired by removal below is a no-op
    const existing = this.editingShape;
    this.editingShape = null;
    const text = area.value.replace(/\s+$/, "");
    area.remove();

    if (commit) {
      const params: ShapeParams = { x: this.editorOrigin.x, y: this.editorOrigin.y, text, fontSize: this.editorFontSize };
      if (existing && existing.shapeParams && "text" in existing.shapeParams) {
        const before = existing.shapeParams;
        if (!text) {
          this.removeShape(existing);
          this.record({ kind: "erase", shapes: [existing] });
        } else if (text !== before.text) {
          this.updateShape(existing, params);
          this.record({ kind: "update", shape: existing, before, after: params });
        }
      } else if (text) {
        const added = this.addShape({ shape: "TEXT", shapeParams: params });
        this.record({ kind: "add", shape: added });
        this.selected = added;
      }
    }
    this.reDraw();
  }

  // --------------------------------------------------------------- shortcuts

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === "z") {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if (mod && key === "y") {
      e.preventDefault();
      this.redo();
    } else if ((e.key === "Delete" || e.key === "Backspace") && this.selected) {
      e.preventDefault();
      this.deleteSelected();
    } else if (e.key === "Escape") {
      this.selected = null;
      this.reDraw();
    }
  };
}
