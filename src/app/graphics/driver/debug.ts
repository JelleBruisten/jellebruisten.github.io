import { RenderStrategy, RenderProgramHandles, RenderStrategyType } from "../types";

export function printRenderInfo(program: { readonly strategy: RenderStrategy; readonly programHandle: RenderProgramHandles | null; readonly canvas: HTMLCanvasElement; }) {

  const typeToLabel = (type: RenderStrategyType) => {
    switch(type) {
      case RenderStrategyType.WebGPU: return 'WebGPU';
      case RenderStrategyType.WebGL: return 'WebGL';
    }
  }

  console.group('Render Info');
  console.info(`Current strategy: ${typeToLabel(program.strategy.type)}, offScreenRendering: ${program.strategy.offscreenRendering}`);
  console.info(`Canvas: `, program.canvas);
  console.info(`Current Handle`, program.programHandle);
  console.info(`Current Program`, program);
  console.groupEnd();
}