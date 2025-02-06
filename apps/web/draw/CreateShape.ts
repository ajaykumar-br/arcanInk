import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";

export type Shape = {
      shape: Tool;
      shapeParams: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }
  | {
      shape: Tool;
      shapeParams: {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
      };
    }
  | {
      shape: Tool;
      shapeParams: {
        x: number;
        y: number;
        radius: number;
      };
    };

export class CreateShape {
  // equivalent to Game class
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[];
  private roomId: string;
  private clicked: boolean;
  private startX = 0;
  private startY = 0;
  private selectedTool: Tool = "RECT";

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
    // remove mouse events
    this.canvas.removeEventListener(
      "mousedown",
      this.mouseDownHandler.bind(this)
    );
    this.canvas.removeEventListener("mouseup", this.mouseUpHandler.bind(this));
    this.canvas.removeEventListener(
      "mousemove",
      this.mouseMoveHandler.bind(this)
    );
  }

  setTool(tool: Tool) {
    this.selectedTool = tool;
  }

  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);
    this.reDraw();
  }

  initHandlers() {
    this.socket.onmessage = (e) => {
      const message = JSON.parse(e.data);
      if (message.type == "chat") {
        const parsedShape: Shape = {
          shape: message.shape,
          shapeParams: JSON.parse(message.shapeParams),
        };
        this.existingShapes.push(parsedShape);
        this.reDraw();
      }
    };
  }

  reDraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.existingShapes.map((shapes: Shape) => {
      const s = shapes.shape;
      const sp = shapes.shapeParams;
      if (s === "RECT" && "width" in sp) {
        this.ctx.strokeStyle = "white";
        this.ctx.strokeRect(sp.x, sp.y, sp.width, sp.height);
      }
    });
  }

  initMouseHandlers() {
    this.canvas.addEventListener("mousedown", this.mouseDownHandler.bind(this));
    this.canvas.addEventListener("mouseup", this.mouseUpHandler.bind(this));
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler.bind(this));
  }

  mouseDownHandler(e: MouseEvent) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
    this.clicked = true;
  }

  mouseMoveHandler(e: MouseEvent) {
    if (!this.clicked) return;
    if (!this.canvas || !this.ctx) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = x - this.startX;
    const height = y - this.startY;

    // Clear previous drawings
    this.reDraw();

    // Draw the rectangle
    this.ctx.strokeStyle = "white";
    this.ctx.strokeRect(this.startX, this.startY, width, height);
  }

  mouseUpHandler(e: MouseEvent) {
    this.clicked = false;
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const width = e.clientX - rect.left - this.startX;
    const height = e.clientY - rect.top - this.startY;

    let shapes: Shape | null = null;

    shapes = {
      shape: "RECT",
      shapeParams: {
        x: this.startX,
        y: this.startY,
        width: width,
        height: height,
      },
    };

    if (!shapes) return;

    this.existingShapes.push(shapes);

    this.socket.send(
      JSON.stringify({
        type: "chat",
        shape: shapes.shape,
        shapeParams: JSON.stringify(shapes.shapeParams),
        roomId: this.roomId,
      })
    );
  }
}
