const { createApp, defineComponent } = Vue;

// Singleton Pattern for NotificationService
class NotificationService {
    constructor() {
        if (NotificationService.instance) {
            return NotificationService.instance;
        }
        this.subscribers = [];
        NotificationService.instance = this;
    }

    static getInstance() {
        return NotificationService.instance || new NotificationService();
    }

    subscribe(subscriber) {
        this.subscribers.push(subscriber);
    }

    notify(message) {
        this.subscribers.forEach(subscriber => subscriber.update(message));
    }
}

// Singleton Pattern for RecipeManager
class RecipeManager {
    constructor() {
        if (RecipeManager.instance) {
            return RecipeManager.instance;
        }
        this.recipes = [];
        this.notificationService = NotificationService.getInstance();
        this.sortStrategy = this.getSortStrategy('name');
        RecipeManager.instance = this;
    }

    static getInstance() {
        return RecipeManager.instance || new RecipeManager();
    }

    getSortStrategy(strategy) {
        if (strategy === 'name') {
            return new NameSortStrategy();
        } else if (strategy === 'ingredientCount') {
            return new IngredientCountSortStrategy();
        }
        return new NameSortStrategy();
    }

    addRecipe(name, ingredients) {
        const newRecipe = {
            id: Date.now(),
            name: name,
            ingredients: ingredients
        };
        this.recipes.push(newRecipe);
        this.notificationService.notify(`Recipe "${name}" has been added.`);
    }

    deleteRecipe(recipe) {
        this.recipes = this.recipes.filter(r => r.id !== recipe.id);
        this.notificationService.notify(`Recipe "${recipe.name}" has been deleted.`);
    }

    getSortedRecipes() {
        return this.sortStrategy.sort(this.recipes);
    }

    changeSortStrategy(strategy) {
        this.sortStrategy = this.getSortStrategy(strategy);
    }
}

// Factory Method Pattern for creating recipe variations
class RecipeFactory {
    static createRecipe(type, name, ingredients) {
        let recipe = new Recipe(name, ingredients);
        if (type === 'spicy') {
            recipe = new SpicyDecorator(recipe);
        } else if (type === 'vegan') {
            recipe = new VeganDecorator(recipe);
        }
        return recipe;
    }
}

// Observer for displaying notifications
class NotificationDisplay {
    constructor(notificationsArray) {
        this.notificationsArray = notificationsArray;
    }

    update(message) {
        this.notificationsArray.push(message);
    }
}

// Sort Strategies
class NameSortStrategy {
    sort(recipes) {
        return recipes.sort((a, b) => a.name.localeCompare(b.name));
    }
}

class IngredientCountSortStrategy {
    sort(recipes) {
        return recipes.sort((a, b) => a.ingredients.length - b.ingredients.length);
    }
}

// Composite Pattern: Ingredient and CompositeIngredient
class Ingredient {
    constructor(name) {
        this.name = name;
    }
}

// Decorator Pattern for Recipe Variations
class Recipe {
    constructor(name, ingredients) {
        this.name = name;
        this.ingredients = ingredients;
    }

    getName() {
        return this.name;
    }

    getIngredients() {
        return this.ingredients;
    }
}

class SpicyDecorator {
    constructor(recipe) {
        this.recipe = recipe;
    }

    getName() {
        return `${this.recipe.getName()} (Spicy)`;
    }

    getIngredients() {
        return [...this.recipe.getIngredients(), 'Chili Peppers'];
    }
}

class VeganDecorator {
    constructor(recipe) {
        this.recipe = recipe;
    }

    getName() {
        return `${this.recipe.getName()} (Vegan)`;
    }

    getIngredients() {
        return [...this.recipe.getIngredients(), 'Tofu'];
    }
}

const RecipeList = defineComponent({
    data() {
        return {
            recipeManager: RecipeManager.getInstance(),
            newRecipeName: '',
            newRecipeIngredients: '',
            filterIngredient: '',
            notifications: [],
            isEditing: false,
            recipeToEdit: null,
        };
    },
    computed: {
        filteredAndSortedRecipes() {
            let filteredRecipes = this.recipeManager.getSortedRecipes();

            if (this.filterIngredient) {
                const ingredientLower = this.filterIngredient.toLowerCase();
                filteredRecipes = filteredRecipes.filter(recipe =>
                    recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(ingredientLower))
                );
            }

            return filteredRecipes;
        }
    },
    methods: {
        loadRecipes() {
            const storedRecipes = localStorage.getItem('recipes');
            if (storedRecipes) {
                this.recipeManager.recipes = JSON.parse(storedRecipes);
            }
        },
        saveRecipes() {
            localStorage.setItem('recipes', JSON.stringify(this.recipeManager.recipes));
        },
        addOrUpdateRecipe() {
            if (this.newRecipeName && this.newRecipeIngredients) {
                const ingredients = this.newRecipeIngredients.split(',').map(ing => ing.trim());

                if (this.isEditing && this.recipeToEdit) {
                    this.recipeToEdit.name = this.newRecipeName;
                    this.recipeToEdit.ingredients = ingredients;
                    this.isEditing = false;
                    this.recipeToEdit = null;
                    this.notifyUser(`Recipe "${this.newRecipeName}" has been updated.`);
                } else {
                    this.recipeManager.addRecipe(this.newRecipeName, ingredients);
                }
                this.saveRecipes();
                this.newRecipeName = '';
                this.newRecipeIngredients = '';
            } else {
                this.notifyUser('Please enter a recipe name and ingredients.');
            }
        },
        deleteRecipe(recipe) {
            this.recipeManager.deleteRecipe(recipe);
            this.saveRecipes();
        },
        editRecipe(recipe) {
            this.newRecipeName = recipe.name;
            this.newRecipeIngredients = recipe.ingredients.join(', ');
            this.isEditing = true;
            this.recipeToEdit = recipe;
        },
        changeSortStrategy(strategy) {
            this.recipeManager.changeSortStrategy(strategy);
        },
        notifyUser(message) {
            this.notifications.push(message);
        },
        addSpicyVariation(recipe) {
            const spicyRecipe = RecipeFactory.createRecipe('spicy', recipe.name, recipe.ingredients);
            this.recipeManager.addRecipe(spicyRecipe.getName(), spicyRecipe.getIngredients());
            this.saveRecipes();
        },
        addVeganVariation(recipe) {
            const veganRecipe = RecipeFactory.createRecipe('vegan', recipe.name, recipe.ingredients);
            this.recipeManager.addRecipe(veganRecipe.getName(), veganRecipe.getIngredients());
            this.saveRecipes();
        }
    },
    mounted() {
        this.loadRecipes();

        const notificationDisplay = new NotificationDisplay(this.notifications);
        this.recipeManager.notificationService.subscribe(notificationDisplay);
    },
    template: `
    <div>
      <div class="mb-5">
        <h4>{{ isEditing ? 'Edit Recipe' : 'Add a New Recipe' }}</h4>
        <input type="text" class="form-control mb-2" v-model="newRecipeName" placeholder="Recipe Name" />
        <input type="text" class="form-control mb-2" v-model="newRecipeIngredients" placeholder="Ingredients (comma-separated)" />
        <button class="btn btn-primary" @click="addOrUpdateRecipe">{{ isEditing ? 'Update Recipe' : 'Add Recipe' }}</button>
      </div>
  
      <div class="row">
        <div class="col-md-3">
          <h4>Filter Recipes</h4>
          <input type="text" class="form-control" v-model="filterIngredient" placeholder="Enter ingredient" />
  
          <h4 class="mt-4">Sort Recipes</h4>
          <select class="form-control" @change="changeSortStrategy($event.target.value)">
            <option value="name">By Name</option>
            <option value="ingredientCount">By Ingredient Count</option>
          </select>
        </div>
  
        <div class="col-md-9">
          <h2 class="mb-4">Recipes</h2>
          <div class="row">
            <div class="col-md-4" v-for="recipe in filteredAndSortedRecipes" :key="recipe.id">
              <div class="card mb-3">
                <div class="card-body">
                  <h5 class="card-title">{{ recipe.name }}</h5>
                  <p class="card-text"><strong>Ingredients:</strong> {{ recipe.ingredients.join(", ") }}</p>
                  <button class="btn btn-warning btn-sm" @click="editRecipe(recipe)">Edit</button>
                  <button class="btn btn-danger btn-sm" @click="deleteRecipe(recipe)">Delete</button>
                  <button class="btn btn-success btn-sm mt-2" @click="addSpicyVariation(recipe)">Add Spicy Variation</button>
                  <button class="btn btn-success btn-sm mt-2" @click="addVeganVariation(recipe)">Add Vegan Variation</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      <div class="mt-5">
        <h3>Notifications</h3>
        <ul class="list-group">
          <li class="list-group-item" v-for="(notification, index) in notifications" :key="index">
            {{ notification }}
          </li>
        </ul>
      </div>
    </div>
  `
});

// Create and mount the Vue application
createApp({
    components: {
        RecipeList
    }
}).mount('#app');