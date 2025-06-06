// Recipe Management Module

// Recipe Actions
async function viewRecipe(recipeId) {
    try {
        const recipe = await api.getRecipe(recipeId);
        app.currentRecipe = recipe;
        
        // Render recipe detail and show modal
        renderRecipeDetail(recipe);
        showModal('recipeDetailModal');
    } catch (error) {
        if (!app.user) {
            showSignUpEncouragementModal('recipe');
        } else {
            showToast('Failed to load recipe', 'error');
        }
    }
}

async function editRecipe(recipeId) {
    try {
        const recipe = await api.getRecipe(recipeId);
        app.editingRecipe = recipe;
        
        // Populate form with recipe data
        populateRecipeForm(recipe);
        
        navigateToPage('create-recipe');
    } catch (error) {
        showToast('Failed to load recipe for editing', 'error');
    }
}

async function copyAndEditRecipe(recipeId) {
    try {
        const result = await api.copyRecipe(recipeId);
        showToast('Recipe copied successfully!', 'success');
        
        // Navigate to edit the copied recipe
        editRecipe(result.recipe.id);
    } catch (error) {
        showToast('Failed to copy recipe', 'error');
    }
}

async function copyRecipe(recipeId) {
    try {
        await api.copyRecipe(recipeId);
        showToast('Recipe copied successfully!', 'success');
        navigateToPage('my-recipes');
    } catch (error) {
        showToast('Failed to copy recipe', 'error');
    }
}

function populateRecipeForm(recipe) {
    document.getElementById('recipeFormTitle').textContent = 'Edit Recipe';
    document.getElementById('recipeTitle').value = recipe.title || '';
    document.getElementById('recipeDescription').value = recipe.description || '';
    document.getElementById('recipeInstructions').value = recipe.instructions || '';
    document.getElementById('recipePrepTime').value = recipe.prep_time || '';
    document.getElementById('recipeCookTime').value = recipe.cook_time || '';
    document.getElementById('recipeServings').value = recipe.servings || '';
    document.getElementById('recipeDifficulty').value = recipe.difficulty || 'easy';
    document.getElementById('recipePublic').value = recipe.is_public ? 'true' : 'false';
    
    // Update preview with loaded instructions
    const instructionsPreview = document.getElementById('instructionsPreview');
    if (instructionsPreview && recipe.instructions) {
        instructionsPreview.innerHTML = marked.parse(recipe.instructions);
    }
    
    // Populate ingredients
    const ingredientsList = document.getElementById('ingredientsList');
    ingredientsList.innerHTML = '';
    
    if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
        recipe.recipe_ingredients.forEach(ingredient => {
            addIngredientRow();
            const lastItem = ingredientsList.lastElementChild;
            lastItem.querySelector('.ingredient-name').value = ingredient.ingredients.name;
            lastItem.querySelector('.ingredient-quantity').value = ingredient.quantity || '';
            lastItem.querySelector('.ingredient-unit').value = ingredient.unit || '';
            lastItem.querySelector('.ingredient-notes').value = ingredient.notes || '';
        });
    } else {
        addIngredientRow();
    }
    
    // Populate tags with typeahead system
    clearSelectedTags();
    if (recipe.recipe_tags && recipe.recipe_tags.length > 0) {
        recipe.recipe_tags.forEach(rt => {
            if (rt.tags) {
                addSelectedTag(rt.tags);
            }
        });
    }
    
    // Handle image
    if (recipe.image_url) {
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = `
            <img src="${recipe.image_url}" alt="Recipe preview" style="max-width: 100%; height: auto; border-radius: 8px;">
            <button type="button" class="btn btn-secondary" onclick="removeRecipeImage()">
                <i class="fas fa-trash"></i> Remove Image
            </button>
        `;
        
        let imageUrlInput = document.getElementById('recipeImageUrl');
        if (!imageUrlInput) {
            imageUrlInput = document.createElement('input');
            imageUrlInput.type = 'hidden';
            imageUrlInput.id = 'recipeImageUrl';
            document.getElementById('recipeForm').appendChild(imageUrlInput);
        }
        imageUrlInput.value = recipe.image_url;
    }
}

function renderRecipeDetail(recipe) {
    const container = document.getElementById('recipeDetailContent');
    const titleElement = document.getElementById('recipeDetailTitle');
    
    titleElement.textContent = recipe.title;
    
    // Get author info with privacy handling
    let authorName = 'Anonymous';
    let authorAvatar = null;
    
    if (recipe.users) {
        if (recipe.users.show_author_name !== false) {
            authorName = recipe.users.full_name || 'Anonymous';
            authorAvatar = recipe.users.avatar_url;
        }
    }
    
    container.innerHTML = `
        <div class="recipe-header">
            <img src="${recipe.image_url || '/api/placeholder-recipe'}" alt="${recipe.title}" class="recipe-detail-image">
            <p class="recipe-description">${recipe.description || ''}</p>
            
            <div class="recipe-author-info" style="display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0; padding: 1rem; background: var(--background-secondary); border-radius: 8px;">
                ${authorAvatar ? 
                    `<img src="${authorAvatar}" alt="" class="author-avatar" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <span class="material-icons" style="font-size: 48px; color: var(--text-secondary); width: 48px; height: 48px; display: none; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-tertiary);">account_circle</span>` : 
                    `<span class="material-icons" style="font-size: 48px; color: var(--text-secondary); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-tertiary);">account_circle</span>`
                }
                <div>
                    <div style="font-weight: 600; color: var(--text-primary);">Recipe by ${authorName}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Created ${new Date(recipe.created_at).toLocaleDateString()}</div>
                </div>
            </div>
            
            <div class="recipe-detail-meta">
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>Prep: ${recipe.prep_time || 0} min</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-fire"></i>
                    <span>Cook: ${recipe.cook_time || 0} min</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-users"></i>
                    <span>${recipe.servings || 1} servings</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-signal"></i>
                    <span>${recipe.difficulty || 'easy'}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-star"></i>
                    <span>${recipe.averageRating?.toFixed(1) || '0.0'} (${recipe.totalRatings || 0} reviews)</span>
                </div>
            </div>
            
            <div class="recipe-tags">
                ${(recipe.recipe_tags || []).map(rt => 
                    `<span class="tag" style="background-color: ${rt.tags?.color || '#3B82F6'}">${rt.tags?.name || ''}</span>`
                ).join('')}
            </div>
            
            <div class="recipe-actions" style="margin-top: 1rem; text-align: center;">
                ${app.user && app.user.id === recipe.user_id ? `
                    <button class="btn btn-primary modal-edit-btn" data-recipe-id="${recipe.id}">
                        <i class="fas fa-edit"></i> Edit Recipe
                    </button>
                    <button class="btn btn-secondary modal-copy-btn" data-recipe-id="${recipe.id}">
                        <i class="fas fa-copy"></i> Copy Recipe
                    </button>
                ` : app.user ? `
                    <button class="btn btn-secondary modal-copy-edit-btn" data-recipe-id="${recipe.id}">
                        <i class="fas fa-copy"></i> Copy & Edit
                    </button>
                ` : ''}
            </div>
        </div>
        
        <div class="recipe-detail-content">
            <div class="ingredients-section">
                <h3>Ingredients</h3>
                <ul class="ingredient-list">
                    ${(recipe.recipe_ingredients || []).map(ri => `
                        <li>
                            <span>${ri.ingredients.name}</span>
                            <span>${ri.quantity || ''} ${ri.unit || ''}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="instructions-section">
                <h3>Instructions</h3>
                <div class="instructions-text">${marked.parse(recipe.instructions)}</div>
            </div>
        </div>
    `;

    // Add event listeners for modal action buttons
    attachModalActionListeners(container);
}

// Shared function for attaching modal action listeners
function attachModalActionListeners(container) {
    container.querySelectorAll('.modal-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('recipeDetailModal');
            editRecipe(btn.dataset.recipeId);
        });
    });

    container.querySelectorAll('.modal-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('recipeDetailModal');
            copyRecipe(btn.dataset.recipeId);
        });
    });

    container.querySelectorAll('.modal-copy-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('recipeDetailModal');
            copyAndEditRecipe(btn.dataset.recipeId);
        });
    });
}

// Recipe Form Functions
function getRecipeFormData() {
    return {
        title: document.getElementById('recipeTitle').value,
        description: document.getElementById('recipeDescription').value,
        instructions: document.getElementById('recipeInstructions').value,
        prepTime: parseInt(document.getElementById('recipePrepTime').value) || 0,
        cookTime: parseInt(document.getElementById('recipeCookTime').value) || 0,
        servings: parseInt(document.getElementById('recipeServings').value) || 1,
        difficulty: document.getElementById('recipeDifficulty').value,
        isPublic: document.getElementById('recipePublic').value === 'true',
        imageUrl: document.getElementById('recipeImageUrl')?.value || null,
        ingredients: getIngredientsFromForm(),
        tags: getSelectedTagIds()
    };
}

function getIngredientsFromForm() {
    const ingredients = [];
    document.querySelectorAll('.ingredient-item').forEach(item => {
        const name = item.querySelector('.ingredient-name').value.trim();
        if (name) {
            ingredients.push({
                name,
                quantity: item.querySelector('.ingredient-quantity').value,
                unit: item.querySelector('.ingredient-unit').value,
                notes: item.querySelector('.ingredient-notes').value
            });
        }
    });
    return ingredients;
}

function getSelectedTagIds() {
    const selectedTags = [];
    document.querySelectorAll('.selected-tag').forEach(tag => {
        selectedTags.push(tag.dataset.tagId);
    });
    return selectedTags;
}

// Ingredient Management
function addIngredientRow() {
    const ingredientsList = document.getElementById('ingredientsList');
    const ingredientItem = document.createElement('div');
    ingredientItem.className = 'ingredient-item';
    
    // Check if this is the first ingredient
    const isFirstIngredient = ingredientsList.children.length === 0;
    
    ingredientItem.innerHTML = `
        <div class="form-group" style="position: relative;">
            <input type="text" placeholder="Ingredient name" class="ingredient-name" ${isFirstIngredient ? 'required' : ''}>
            <div class="ingredient-suggestions-container ingredient-suggestions"></div>
        </div>
        <div class="form-group">
            <input type="number" placeholder="Quantity" class="ingredient-quantity" step="0.01">
        </div>
        <div class="form-group">
            <input type="text" placeholder="Unit" class="ingredient-unit">
        </div>
        <div class="form-group">
            <input type="text" placeholder="Notes" class="ingredient-notes">
        </div>
        <button type="button" class="ingredient-remove" ${isFirstIngredient ? 'style="display: none;"' : ''}>
            <span class="material-icons">close</span>
        </button>
    `;
    
    ingredientsList.appendChild(ingredientItem);
    
    // Add event listener to the remove button
    const removeBtn = ingredientItem.querySelector('.ingredient-remove');
    removeBtn.addEventListener('click', () => {
        removeIngredientRow(removeBtn);
    });
    
    // Add ingredient typeahead functionality
    const ingredientInput = ingredientItem.querySelector('.ingredient-name');
    initializeIngredientTypeahead(ingredientInput);
    
    // Update remove button visibility for all ingredients
    updateIngredientRemoveButtons();
}

function removeIngredientRow(button) {
    button.closest('.ingredient-item').remove();
    updateIngredientRemoveButtons();
}

function updateIngredientRemoveButtons() {
    const container = document.getElementById('ingredientsList');
    const ingredients = container.querySelectorAll('.ingredient-item');
    
    ingredients.forEach((ingredient, index) => {
        const removeBtn = ingredient.querySelector('.ingredient-remove');
        if (removeBtn) {
            // Hide remove button for first ingredient, show for others
            if (index === 0) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = 'block';
            }
        }
        
        // Make first ingredient required
        const nameInput = ingredient.querySelector('.ingredient-name');
        if (nameInput) {
            if (index === 0) {
                nameInput.setAttribute('required', '');
            } else {
                nameInput.removeAttribute('required');
            }
        }
    });
}

function clearIngredientsList() {
    document.getElementById('ingredientsList').innerHTML = '';
    addIngredientRow(); // Add one empty row
}

function removeRecipeImage() {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = `
        <button type="button" id="uploadImageBtn" class="upload-btn">
            <i class="fas fa-camera"></i>
            <span>Upload Image</span>
        </button>
    `;
    
    // Re-attach event listener
    const uploadBtn = document.getElementById('uploadImageBtn');
    uploadBtn.addEventListener('click', () => {
        document.getElementById('recipeImage').click();
    });
    
    // Remove hidden input
    const imageUrlInput = document.getElementById('recipeImageUrl');
    if (imageUrlInput) {
        imageUrlInput.remove();
    }
}

function clearEditingState() {
    app.editingRecipe = null;
    document.getElementById('recipeFormTitle').textContent = 'Create New Recipe';
    document.getElementById('recipeForm').reset();
    clearSelectedTags();
    clearIngredientsList();
    
    // Clear image preview
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.innerHTML = `
            <button type="button" id="uploadImageBtn" class="upload-btn">
                <i class="fas fa-camera"></i>
                <span>Upload Image</span>
            </button>
        `;
        
        // Re-attach event listener
        const uploadBtn = document.getElementById('uploadImageBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                document.getElementById('recipeImage').click();
            });
        }
    }
    
    // Clear instructions preview
    const instructionsPreview = document.getElementById('instructionsPreview');
    if (instructionsPreview) {
        instructionsPreview.innerHTML = '<div class="preview-placeholder" style="color: var(--text-secondary); font-style: italic; text-align: center; padding: 2rem;">Start typing above to see preview...</div>';
    }
}

// Legacy functions for backward compatibility
function renderRecipeTagsForm() {
    initializeTagInput();
}

function renderIngredientsDatalist() {
    const datalist = document.getElementById('ingredientsDatalist');
    if (!datalist) return;

    datalist.innerHTML = app.ingredients.map(ingredient => `
        <option value="${ingredient.name}">
    `).join('');
}

// Export to global scope
window.viewRecipe = viewRecipe;
window.editRecipe = editRecipe;
window.copyAndEditRecipe = copyAndEditRecipe;
window.copyRecipe = copyRecipe;
window.populateRecipeForm = populateRecipeForm;
window.renderRecipeDetail = renderRecipeDetail;
window.getRecipeFormData = getRecipeFormData;
window.getIngredientsFromForm = getIngredientsFromForm;
window.getSelectedTagIds = getSelectedTagIds;
window.addIngredientRow = addIngredientRow;
window.removeIngredientRow = removeIngredientRow;
window.clearIngredientsList = clearIngredientsList;
window.removeRecipeImage = removeRecipeImage;
window.clearEditingState = clearEditingState;
window.renderRecipeTagsForm = renderRecipeTagsForm;
window.renderIngredientsDatalist = renderIngredientsDatalist;
