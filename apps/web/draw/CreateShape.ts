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
  private isMouseHandlersInitialized = false;

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
    this.existingShapes.forEach((shape: Shape) => {
      this.ctx.strokeStyle = "white";
      const { shape: tool, shapeParams } = shape;
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
      }
    });
  }

  initMouseHandlers() {
    if (this.isMouseHandlersInitialized) return;
    this.isMouseHandlersInitialized = true;
    this.canvas.addEventListener("mousedown", this.mouseDownHandler.bind(this));
    this.canvas.addEventListener("mouseup", this.mouseUpHandler.bind(this));
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler.bind(this));
  }

  mouseDownHandler(e: MouseEvent) {
    if (!this.canvas) return;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.clicked = true;
  }

  drawRect(e: MouseEvent) {
    const width = e.clientX - this.startX;
    const height = e.clientY - this.startY;
    this.ctx.strokeStyle = "white";
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

  mouseMoveHandler(e: MouseEvent) {
    if (!this.clicked) return;
    if (!this.canvas || !this.ctx) return;

    const x = e.clientX;
    const y = e.clientY;    
    
    // Clear previous drawings
    this.reDraw();
    
    // Draw the rectangle
    if (this.selectedTool === "RECT") {
      this.drawRect(e);
    } else if(this.selectedTool === "CIRCLE") {
      this.drawCircle(e);
    } else if(this.selectedTool === "LINE") {
      this.drawLine(e);
    }
  }

  mouseUpHandler(e: MouseEvent) {
    // to prevent from reloading the page
    e.stopPropagation();
    e.preventDefault();

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
    }

    if (!shapes) return;

    console.log(shapes);

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
