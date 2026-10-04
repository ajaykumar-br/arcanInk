import { Tool } from "@/components/Canvas";
import getStroke from "perfect-freehand";
import type { Theme } from "@/components/ThemeProvider";
import { getExistingShapes } from "./http";

export type Shape = {
  id?: number | string;
  clientId?: string; // set on shapes drawn locally until the server echo assigns an id
  shape: Tool;
  shapeParams: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  } | {
    x: number;
    y: number;
    radius: number;
  } | {
      points: { x: number; y: number; pressure?: number }[];
      size?: number;
  }
}
  

const THEME_COLORS: Record<Theme, { background: string; ink: string }> = {
  dark: { background: "#232329", ink: "#ffffff" },
  light: { background: "#ffffff", ink: "#1b1b1f" },
};

const FREEHAND_SIZE = 4;

export class CreateShape {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[];
  private roomId: string;
  private clicked: boolean;
  private startX = 0;
  private startY = 0;
  private selectedTool: Tool = "";
  private isMouseHandlersInitialized = false;
  private points: {x: number, y: number, pressure?: number}[] = []; // pencil / freehand points
  private theme: Theme = "dark";
  private activePointerId: number | null = null;
  private usesRealPressure = false;
  private deleteShapes: boolean = false;
  private deleteShapeId: Set<number | string> = new Set();

  socket: WebSocket;

  constructor(canvas: HTMLCanvasElement, socket: WebSocket, roomId: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.existingShapes = [];
    this.roomId = roomId;
    this.clicked = false;
    this.socket = socket;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.init(); // init existing shapes
    this.initHandlers(); // on receiving message push to existingShapes variable
    this.initMouseHandlers(); // init mouse handlers
  }

  destroy() {
    // remove pointer events
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointermove", this.mouseMoveHandler);
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.reDraw();
  }

  private get ink() {
    return THEME_COLORS[this.theme].ink;
  }

  // Smoothed, pressure-aware outline of a stroke rendered as a filled path.
  private drawFreehand(points: { x: number; y: number; pressure?: number }[], size = FREEHAND_SIZE, complete = true) {
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

  setTool(tool: Tool) {
    this.selectedTool = tool;
  }

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

  initHandlers() {
    this.socket.onmessage = (e) => {
      const message = JSON.parse(e.data);
      if (message.type == "chat") {
        const parsedShape: Shape = {
          id: message.id,
          shape: message.shape,
          shapeParams: JSON.parse(message.shapeParams),
        };
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
        this.reDraw();
      } else if (message.type == "error") {
        console.error("Server error:", message.message);
      }
    };
  }

  reDraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = THEME_COLORS[this.theme].background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.existingShapes.forEach((shape: Shape) => {
      this.ctx.strokeStyle = this.ink;
      const { shape: tool, shapeParams } = shape; // variable is tool type
      if (tool === "RECT" && "width" in shapeParams) {
        this.ctx.strokeRect(
          shapeParams.x,
          shapeParams.y,
          shapeParams.width,
          shapeParams.height
        );
      } else if (tool === "CIRCLE" && "radius" in shapeParams) {
        this.ctx.beginPath();
        this.ctx.arc(
          shapeParams.x,
          shapeParams.y,
          shapeParams.radius,
          0,
          2 * Math.PI
        );
        this.ctx.stroke();
      } else if (tool === "LINE" && "x2" in shapeParams) {
        this.ctx.beginPath();
        this.ctx.moveTo(shapeParams.x1, shapeParams.y1);
        this.ctx.lineTo(shapeParams.x2, shapeParams.y2);
        this.ctx.stroke();
      } else if (tool === "PENCIL" && "points" in shapeParams) {
        const points = shapeParams.points;
        if(points.length < 2) return;
        this.ctx.beginPath();
        if (points[0] !== undefined) {
          this.ctx.moveTo(points[0].x, points[0].y);
        }
        points.forEach( point => this.ctx.lineTo(point.x, point.y));
        this.ctx.stroke();
        this.ctx.closePath();
      } else if (tool === "FREEHAND" && "points" in shapeParams) {
        this.drawFreehand(shapeParams.points, shapeParams.size);
      } else if (tool === "ARROW" && "x2" in shapeParams) {
        const arrowLength = 10;
        const angle = Math.atan2(shapeParams.y2 - shapeParams.y1, shapeParams.x2 - shapeParams.x1);
        this.ctx.beginPath();
        this.ctx.moveTo(shapeParams.x1, shapeParams.y1);
        this.ctx.lineTo(shapeParams.x2, shapeParams.y2);
        this.ctx.lineTo(shapeParams.x2 - arrowLength * Math.cos(angle - Math.PI/6), shapeParams.y2 - arrowLength * Math.sin(angle - Math.PI/6));
        this.ctx.moveTo(shapeParams.x2, shapeParams.y2);
        this.ctx.lineTo(shapeParams.x2 - arrowLength * Math.cos(angle + Math.PI/6), shapeParams.y2 - arrowLength * Math.sin(angle + Math.PI/6));
        this.ctx.stroke();
        this.ctx.closePath();
      }
    });
  }

  initMouseHandlers() {
    if (this.isMouseHandlersInitialized) return;
    this.isMouseHandlersInitialized = true;
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("pointermove", this.mouseMoveHandler);
  }

  // Arrow-function properties keep a stable reference so destroy() can really remove them.
  private onPointerDown = (e: PointerEvent) => {
    if (this.activePointerId !== null) return; // ignore extra touches mid-stroke
    this.activePointerId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
    this.mouseDownHandler(e);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.mouseUpHandler(e);
  };

  mouseDownHandler(e: MouseEvent) {
    if (!this.canvas) return;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.clicked = true;

    if(this.selectedTool === "FREEHAND") {
      // Mouse reports a constant 0.5 pressure, so only trust pens and touch with real values.
      this.usesRealPressure = e instanceof PointerEvent && e.pointerType !== "mouse" && e.pressure > 0;
      this.points = [this.freehandPoint(e)];
      return;
    }

    if(this.selectedTool === "PENCIL") {
      this.points.push({x:this.startX, y:this.startY})
    } else if(this.selectedTool === "ERASER") {
      this.deleteShapes = true;
    }
  }

  freehandPoint(e: MouseEvent) {
    const point: { x: number; y: number; pressure?: number } = { x: e.clientX, y: e.clientY };
    if (this.usesRealPressure && e instanceof PointerEvent) point.pressure = e.pressure;
    return point;
  }

  drawRect(e: MouseEvent) {
    const width = e.clientX - this.startX;
    const height = e.clientY - this.startY;
    this.ctx.strokeStyle = this.ink;
    this.ctx.strokeRect(this.startX, this.startY, width, height);
  }

  drawCircle(e: MouseEvent) {
    const radius = Math.sqrt(
      Math.pow(e.clientX - this.startX, 2) +
        Math.pow(e.clientY - this.startY, 2)
    );
    this.ctx.beginPath();
    this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  drawLine(e: MouseEvent) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.startX, this.startY);
    this.ctx.lineTo(e.clientX, e.clientY);
    this.ctx.stroke();
  }

  drawPencil(e: MouseEvent) {
    // Draw a line from the last point to the current point
    this.reDraw();
    this.points.push({x:e.clientX, y:e.clientY});
    this.ctx.beginPath();
    if(!this.points[0]) return;
    this.ctx.moveTo(this.points[0]?.x, this.points[0].y);
    this.points.forEach(point => this.ctx.lineTo(point.x, point.y));
    this.ctx.stroke();
    this.startX = e.clientX;
    this.startY = e.clientY;
  }

  drawArrow(e: MouseEvent) {
    const arrowLength = 10;
    const angle = Math.atan2(e.clientY - this.startY, e.clientX - this.startX);
    const x2 = e.clientX;
    const y2 = e.clientY;
    this.ctx.beginPath();
    this.ctx.moveTo(this.startX, this.startY);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x2 - arrowLength * Math.cos(angle - Math.PI/6), y2 - arrowLength * Math.sin(angle - Math.PI/6));
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(x2 - arrowLength * Math.cos(angle + Math.PI/6), y2 - arrowLength * Math.sin(angle + Math.PI/6));
    this.ctx.stroke();
    this.ctx.closePath();
  }

  distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = 0;
    if (lenSq !== 0) {
      param = Math.max(0, Math.min(1, dot / lenSq));
    }

    const xx = x1 + param * C;
    const yy = y1 + param * D;

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  isPointInShape(x: number, y: number, shape: Shape) {
    const { shape: tool, shapeParams: sp } = shape;
    const ERASER_BUFFER = 5;

    if(tool === "RECT" && "width" in sp) {
      return (x >= sp.x && x <=sp.x + sp.width && y >= sp.y && y <= sp.y + sp.height);
    } else if(tool === "CIRCLE" && "radius" in sp) {
      const dx = x - sp.x;
      const dy = y - sp.y;
      return (dx * dx + dy * dy <= sp.radius * sp.radius);
    } else if ((tool === "LINE" && "x2" in sp) || (tool === "ARROW" && "x2" in sp)) {
      const { x1, y1, x2, y2 } = sp;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      if (x < minX || x > maxX || y < minY || y > maxY) return false;

      const A = x - x1;
      const B = y - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) {
        param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));
      }

      const xx = x1 + param * C;
      const yy = y1 + param * D;

      const dx = x - xx;
      const dy = y - yy;
      const distanceSq = dx * dx + dy * dy;

      return distanceSq <= ERASER_BUFFER * ERASER_BUFFER;
    } else if((tool === "PENCIL" || tool === "FREEHAND") && "points" in sp) {
      const { points } = sp;
      const ERASER_BUFFER = 10;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        if(!p1 || !p2) continue;

        if (this.distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= ERASER_BUFFER) {
          return true;
        }
      }
      return false;
    }
  }

  mouseMoveHandler = (e: PointerEvent) => {
    if (!this.clicked) return;
    if (!this.canvas || !this.ctx) return;

    const x = e.clientX;
    const y = e.clientY;
    
    // Clear previous drawings
    this.reDraw();
    
    // Draw shapes
    if (this.selectedTool === "RECT") {
      this.drawRect(e);
    } else if(this.selectedTool === "CIRCLE") {
      this.drawCircle(e);
    } else if(this.selectedTool === "LINE") {
      this.drawLine(e);
    } else if(this.selectedTool === "PENCIL") {
      this.drawPencil(e);
    } else if(this.selectedTool === "FREEHAND") {
      // Coalesced events recover the samples the browser merged, which keeps fast strokes smooth.
      const events = e.getCoalescedEvents?.() ?? [];
      (events.length ? events : [e]).forEach((ev) => this.points.push(this.freehandPoint(ev)));
      this.drawFreehand(this.points, FREEHAND_SIZE, false);
    } else if(this.selectedTool === "ARROW") {
      this.drawArrow(e);
    } else if(this.selectedTool === "ERASER") {
      const deleted: (number | string)[] = [];
      [...this.existingShapes].reverse().forEach((shape) => {
        if(shape.id && this.isPointInShape(x, y, shape)) {
          deleted.push(shape.id);
          this.deleteShapeId.add(shape.id);
          this.existingShapes = this.existingShapes.filter((s) => s.id !== shape.id);
        }
      });
      this.deleteViaSocket();
    }
  }

  deleteViaSocket() {
    if(!this.deleteShapeId.size) return;

    this.send({
      type: "erase",
      shapeIds: Array.from(this.deleteShapeId),
      roomId: this.roomId
    });
    this.deleteShapeId.clear();
  }

  mouseUpHandler(e: MouseEvent) {
    this.clicked = false;
    if (!this.canvas) return;

    let shapes: Shape | null = null;
    
    const width = e.clientX - this.startX;
    const height = e.clientY - this.startY;

    if(this.selectedTool === "RECT") {
      shapes = {
        shape: "RECT",
        shapeParams: {
          x: this.startX,
          y: this.startY,
          width: width,
          height: height,
        }
      }
    } else if(this.selectedTool === "LINE") {
      shapes = {
        shape: "LINE",
        shapeParams: {
          x1: this.startX,
          y1: this.startY,
          x2: e.clientX,
          y2: e.clientY,
        }
      }
    } else if(this.selectedTool === "CIRCLE") {
      const radius = Math.sqrt(
        Math.pow(e.clientX - this.startX, 2) +
        Math.pow(e.clientY - this.startY, 2)
      );
      shapes = {
        shape: "CIRCLE",
        shapeParams: {
          x: this.startX,
          y: this.startY,
          radius: radius,
        }
      }
    } else if(this.selectedTool === "PENCIL" && this.points.length > 0) {
      shapes = {
        shape: "PENCIL",
        shapeParams: {
          points: this.points,
        }
      }
      this.points = [];
    } else if(this.selectedTool === "FREEHAND" && this.points.length > 0) {
      shapes = {
        shape: "FREEHAND",
        shapeParams: {
          points: this.points,
          size: FREEHAND_SIZE,
        }
      }
      this.points = [];
    } else if(this.selectedTool === "ARROW") {
      shapes = {
        shape: "ARROW",
        shapeParams: {
          x1: this.startX,
          y1: this.startY,
          x2: e.clientX,
          y2: e.clientY
        }
      }
    } else if(this.selectedTool === "ERASER") {
      this.deleteViaSocket();
      this.reDraw();
      return;
    }

    if (!shapes) return;

    shapes.clientId = crypto.randomUUID();
    this.existingShapes.push(shapes);

    this.send({
      type: "chat",
      shape: shapes.shape,
      shapeParams: JSON.stringify(shapes.shapeParams),
      roomId: this.roomId,
      clientId: shapes.clientId,
    });
  }
}
