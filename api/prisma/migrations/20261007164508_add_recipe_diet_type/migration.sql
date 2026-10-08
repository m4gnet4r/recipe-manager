-- DropIndex
DROP INDEX "idx_ingredients_name_trgm";

-- DropIndex
DROP INDEX "idx_recipes_name_trgm";

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "diet_type" TEXT;
