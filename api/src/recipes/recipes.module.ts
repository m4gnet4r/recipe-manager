import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { AuthModule } from '../auth/auth.module';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [AuthModule, GraphModule],
  providers: [RecipesService],
  controllers: [RecipesController],
})
export class RecipesModule {}
