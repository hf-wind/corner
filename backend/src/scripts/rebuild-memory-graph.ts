import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MemoryGraphService } from '../modules/memory-graph/memory-graph.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const result = await app.get(MemoryGraphService).rebuild();
    console.log(
      `记忆图谱重建完成：${result.nodes} 个节点，${result.relations} 条自动关系`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
