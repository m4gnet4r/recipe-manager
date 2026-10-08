-- Prisma's schema language has no CHECK-constraint support for this
-- version, so the polymorphic "ingredient XOR recipe" shape of a
-- recipe_component, and the self-reference guard, are added by hand here.

ALTER TABLE "recipe_components"
  ADD CONSTRAINT "xor_component" CHECK (
    (kind = 'ingredient' AND ingredient_id IS NOT NULL
       AND child_recipe_id IS NULL AND unit_code IS NOT NULL)
    OR
    (kind = 'recipe' AND child_recipe_id IS NOT NULL
       AND ingredient_id IS NULL AND unit_code IS NULL)
  );

ALTER TABLE "recipe_components"
  ADD CONSTRAINT "no_self_reference" CHECK (parent_id <> child_recipe_id);

-- Trigram index to support fast partial-name search on recipes/ingredients.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_recipes_name_trgm ON recipes USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm ON ingredients USING gin (name gin_trgm_ops);
