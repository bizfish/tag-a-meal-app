// Ingredient Filter System Module

// Ingredient Filter State
let ingredientFilterState = {
    includeIngredients: [],
    excludeIngredients: [],
    allIngredients: []
};

async function initializeIngredientFilter() {
    const filterInput = document.getElementById('ingredientFilterSearch');
    const dropdown = document.getElementById('ingredientFilterDropdown');
    const selectedContainer = document.getElementById('selectedIngredientFilters');
    
    if (!filterInput || !dropdown || !selectedContainer) {
        console.log('Ingredient filter elements not found');
        return;
    }
    
    // Load all ingredients
    try {
        const response = await api.getIngredients();
        ingredientFilterState.allIngredients = response.ingredients || [];
    } catch (error) {
        console.error('Error loading ingredients for filter:', error);
        ingredientFilterState.allIngredients = [];
    }
    
    // Add event listeners
    filterInput.addEventListener('input', debounce(handleIngredientFilterInput, 200));
    filterInput.addEventListener('focus', handleIngredientFilterInput);
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.ingredient-filter-input')) {
            dropdown.style.display = 'none';
        }
    });
    
    // Initial render
    renderSelectedIngredientFilters();
}

function handleIngredientFilterInput(event) {
    const query = event.target.value.trim().toLowerCase();
    const dropdown = document.getElementById('ingredientFilterDropdown');
    
    if (query.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    
    // Filter ingredients based on query
    const filteredIngredients = ingredientFilterState.allIngredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(query) &&
        !ingredientFilterState.includeIngredients.some(inc => inc.id === ingredient.id) &&
        !ingredientFilterState.excludeIngredients.some(exc => exc.id === ingredient.id)
    );
    
    if (filteredIngredients.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    
    // Render dropdown items
    dropdown.innerHTML = filteredIngredients.slice(0, 10).map(ingredient => `
        <div class="ingredient-filter-item" data-ingredient-id="${ingredient.id}" data-ingredient-name="${ingredient.name}">
            <div>
                <div class="ingredient-name">${ingredient.name}</div>
                ${ingredient.category ? `<div class="ingredient-category">${ingredient.category}</div>` : ''}
            </div>
            <div class="click-hint">Left: include, Right: exclude</div>
        </div>
    `).join('');
    
    // Add event listeners to dropdown items
    dropdown.querySelectorAll('.ingredient-filter-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const ingredientId = item.dataset.ingredientId;
            const ingredientName = item.dataset.ingredientName;
            const ingredient = ingredientFilterState.allIngredients.find(ing => ing.id === ingredientId);
            
            if (ingredient) {
                addIngredientFilter(ingredient, 'include');
            }
        });
        
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const ingredientId = item.dataset.ingredientId;
            const ingredientName = item.dataset.ingredientName;
            const ingredient = ingredientFilterState.allIngredients.find(ing => ing.id === ingredientId);
            
            if (ingredient) {
                addIngredientFilter(ingredient, 'exclude');
            }
        });
    });
    
    dropdown.style.display = 'block';
}

function addIngredientFilter(ingredient, type) {
    // Remove from opposite list if exists
    if (type === 'include') {
        ingredientFilterState.excludeIngredients = ingredientFilterState.excludeIngredients.filter(
            exc => exc.id !== ingredient.id
        );
        if (!ingredientFilterState.includeIngredients.some(inc => inc.id === ingredient.id)) {
            ingredientFilterState.includeIngredients.push(ingredient);
        }
    } else {
        ingredientFilterState.includeIngredients = ingredientFilterState.includeIngredients.filter(
            inc => inc.id !== ingredient.id
        );
        if (!ingredientFilterState.excludeIngredients.some(exc => exc.id === ingredient.id)) {
            ingredientFilterState.excludeIngredients.push(ingredient);
        }
    }
    
    // Clear input and hide dropdown
    document.getElementById('ingredientFilterSearch').value = '';
    document.getElementById('ingredientFilterDropdown').style.display = 'none';
    
    // Re-render selected filters
    renderSelectedIngredientFilters();
    
    // Trigger recipe filtering
    if (window.filterRecipes) {
        filterRecipes();
    }
}

function removeIngredientFilter(ingredientId, type) {
    if (type === 'include') {
        ingredientFilterState.includeIngredients = ingredientFilterState.includeIngredients.filter(
            inc => inc.id !== ingredientId
        );
    } else {
        ingredientFilterState.excludeIngredients = ingredientFilterState.excludeIngredients.filter(
            exc => exc.id !== ingredientId
        );
    }
    
    renderSelectedIngredientFilters();
    if (window.filterRecipes) {
        filterRecipes();
    }
}

function renderSelectedIngredientFilters() {
    const container = document.getElementById('selectedIngredientFilters');
    if (!container) return;
    
    const includeHtml = ingredientFilterState.includeIngredients.map(ingredient => `
        <div class="ingredient-filter-pill include" data-ingredient-id="${ingredient.id}" data-type="include">
            <span>+${ingredient.name}</span>
            <button class="remove-pill" onclick="removeIngredientFilter('${ingredient.id}', 'include')">&times;</button>
        </div>
    `).join('');
    
    const excludeHtml = ingredientFilterState.excludeIngredients.map(ingredient => `
        <div class="ingredient-filter-pill exclude" data-ingredient-id="${ingredient.id}" data-type="exclude">
            <span>-${ingredient.name}</span>
            <button class="remove-pill" onclick="removeIngredientFilter('${ingredient.id}', 'exclude')">&times;</button>
        </div>
    `).join('');
    
    container.innerHTML = includeHtml + excludeHtml;
}

function getIngredientFilterParams() {
    const includeIngredients = ingredientFilterState.includeIngredients.map(ing => ing.name).join(',');
    const excludeIngredients = ingredientFilterState.excludeIngredients.map(ing => ing.name).join(',');
    
    const params = {};
    if (includeIngredients) params.includeIngredients = includeIngredients;
    if (excludeIngredients) params.excludeIngredients = excludeIngredients;
    
    return params;
}

// Export to global scope
window.ingredientFilterState = ingredientFilterState;
window.initializeIngredientFilter = initializeIngredientFilter;
window.removeIngredientFilter = removeIngredientFilter;
window.getIngredientFilterParams = getIngredientFilterParams;
