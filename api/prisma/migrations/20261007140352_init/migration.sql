-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "code" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_unit_code" TEXT NOT NULL,
    "category" TEXT,
    "is_vegan" BOOLEAN,
    "is_vegetarian" BOOLEAN,
    "cost_per_unit" DECIMAL(10,4),
    "kcal_per_unit" DECIMAL(10,4),

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "servings" INTEGER NOT NULL,
    "prep_min" INTEGER,
    "cook_min" INTEGER,
    "difficulty" TEXT,
    "category" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_components" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ingredient_id" TEXT,
    "child_recipe_id" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_code" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "recipe_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_owner_id_name_key" ON "recipes"("owner_id", "name");

-- CreateIndex
CREATE INDEX "recipe_components_parent_id_idx" ON "recipe_components"("parent_id");

-- CreateIndex
CREATE INDEX "recipe_components_child_recipe_id_idx" ON "recipe_components"("child_recipe_id");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_default_unit_code_fkey" FOREIGN KEY ("default_unit_code") REFERENCES "units"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_child_recipe_id_fkey" FOREIGN KEY ("child_recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_unit_code_fkey" FOREIGN KEY ("unit_code") REFERENCES "units"("code") ON DELETE SET NULL ON UPDATE CASCADE;
