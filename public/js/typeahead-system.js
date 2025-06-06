// Shared Typeahead System Module
class TypeaheadSystem {
    constructor(type, config) {
        this.type = type; // 'tags' or 'ingredients'
        this.config = config;
        this.allItems = [];
        this.selectedItems = type === 'tags' ? [] : null; // Only tags have selection
        this.searchTimeout = null;
        this.apiEndpoint = type === 'tags' ? 'getTags' : 'getIngredients';
        this.createEndpoint = type === 'tags' ? 'createTag' : 'createIngredient';
    }

    async loadAllItems() {
        try {
            console.log(`TypeaheadSystem (${this.type}): Loading items from API endpoint: ${this.apiEndpoint}`);
            const response = await api[this.apiEndpoint]();
            console.log(`TypeaheadSystem (${this.type}): API response:`, response);
            this.allItems = response[this.type] || [];
            console.log(`TypeaheadSystem (${this.type}): Loaded ${this.allItems.length} items:`, this.allItems);
        } catch (error) {
            console.error(`Error loading ${this.type}:`, error);
            this.allItems = [];
        }
    }

    async initialize(inputElement, suggestionsContainer) {
        if (!inputElement || !suggestionsContainer) {
            console.log(`TypeaheadSystem (${this.type}): Missing elements`, { inputElement, suggestionsContainer });
            return;
        }
        
        console.log(`TypeaheadSystem (${this.type}): Initializing with`, { inputElement, suggestionsContainer });
        
        // Load items if not already loaded
        if (this.allItems.length === 0) {
            console.log(`TypeaheadSystem (${this.type}): Loading items...`);
            await this.loadAllItems();
            console.log(`TypeaheadSystem (${this.type}): Loaded ${this.allItems.length} items`);
        }
        
        // Add event listeners
        inputElement.addEventListener('input', (e) => this.handleInput(e, suggestionsContainer));
        inputElement.addEventListener('keydown', (e) => this.handleKeydown(e, suggestionsContainer, inputElement));
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest(this.config.containerSelector)) {
                if (suggestionsContainer) {
                    suggestionsContainer.style.display = 'none';
                }
            }
        });
    }

    handleInput(event, suggestionsContainer) {
        const query = event.target.value.trim();
        
        clearTimeout(this.searchTimeout);
        
        if (query.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.showSuggestions(query, suggestionsContainer, event.target);
        }, 200);
    }

    handleKeydown(event, suggestionsContainer, inputElement) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const query = event.target.value.trim();
            if (query) {
                const existingItem = this.allItems.find(item => 
                    item.name.toLowerCase() === query.toLowerCase()
                );
                if (existingItem) {
                    this.selectItem(existingItem, inputElement);
                } else {
                    this.createAndSelectItem(query, inputElement);
                }
                if (this.type === 'tags') {
                    event.target.value = '';
                }
                suggestionsContainer.style.display = 'none';
            }
        }
    }

    showSuggestions(query, suggestionsContainer, inputElement) {
        // Filter existing items
        let matchingItems = this.allItems.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
        );

        // For tags, exclude already selected ones
        if (this.type === 'tags' && this.selectedItems) {
            matchingItems = matchingItems.filter(item =>
                !this.selectedItems.some(selected => selected.id === item.id)
            );
        }
        
        let html = '';
        
        // Show matching existing items (show all matches, no limit)
        matchingItems.forEach(item => {
            if (this.type === 'tags') {
                html += `
                    <div class="tag-suggestion" data-item-id="${item.id}">
                        <span class="tag" style="background-color: ${item.color}">${item.name}</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="ingredient-suggestion" data-item-name="${item.name}">
                        <span>${item.name}</span>
                        ${item.category ? `<span class="ingredient-category">${item.category}</span>` : ''}
                    </div>
                `;
            }
        });
        
        // Show "create new" option if no exact match
        const exactMatch = this.allItems.find(item => 
            item.name.toLowerCase() === query.toLowerCase()
        );
        if (!exactMatch) {
            const suggestionClass = this.type === 'tags' ? 'tag-suggestion' : 'ingredient-suggestion';
            html += `
                <div class="${suggestionClass} create-new" data-create-item="${query}">
                    <i class="fas fa-plus"></i>
                    <span>Create "${query}"</span>
                </div>
            `;
        }
        
        if (html) {
            const suggestionClass = this.type === 'tags' ? 'tag-suggestion' : 'ingredient-suggestion';
            suggestionsContainer.innerHTML = html;
            suggestionsContainer.style.display = 'block';
            
            // Add click handlers
            suggestionsContainer.querySelectorAll(`.${suggestionClass}`).forEach(suggestion => {
                suggestion.addEventListener('click', () => {
                    this.handleSuggestionClick(suggestion, inputElement, suggestionsContainer);
                });
            });
        } else {
            suggestionsContainer.style.display = 'none';
        }
    }

    handleSuggestionClick(suggestion, inputElement, suggestionsContainer) {
        const itemId = suggestion.dataset.itemId;
        const itemName = suggestion.dataset.itemName;
        const createItem = suggestion.dataset.createItem;
        
        if (itemId || itemName) {
            // Use existing item
            const item = this.allItems.find(i => i.id === itemId || i.name === itemName);
            if (item) {
                this.selectItem(item, inputElement);
            }
        } else if (createItem) {
            // Create new item
            this.createAndSelectItem(createItem, inputElement);
        }
        
        if (this.type === 'tags') {
            inputElement.value = '';
        }
        suggestionsContainer.style.display = 'none';
    }

    selectItem(item, inputElement) {
        if (this.type === 'tags') {
            this.addSelectedTag(item);
        } else {
            inputElement.value = item.name;
        }
    }

    async createAndSelectItem(name, inputElement) {
        try {
            let createData = { name };
            
            // Add type-specific data
            if (this.type === 'tags') {
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
                createData.color = colors[Math.floor(Math.random() * colors.length)];
            }
            
            const response = await api[this.createEndpoint](createData);
            const newItem = response[this.type.slice(0, -1)]; // 'tags' -> 'tag', 'ingredients' -> 'ingredient'
            
            // Add to allItems array
            this.allItems.push(newItem);
            
            // Select the new item
            this.selectItem(newItem, inputElement);
            
            const itemType = this.type.slice(0, -1); // Remove 's'
            showToast(`Created new ${itemType} "${name}"`, 'success');
        } catch (error) {
            console.error(`Error creating ${this.type.slice(0, -1)}:`, error);
            if (this.type === 'ingredients') {
                // Still allow the user to use the ingredient name even if creation failed
                inputElement.value = name;
                showToast('Ingredient name saved (creation failed)', 'warning');
            } else {
                showToast(`Failed to create ${this.type.slice(0, -1)}`, 'error');
            }
        }
    }

    // Tag-specific methods
    addSelectedTag(tag) {
        if (this.type !== 'tags') return;
        
        // Check if already selected
        if (this.selectedItems.some(selected => selected.id === tag.id)) {
            return;
        }
        
        this.selectedItems.push(tag);
        this.renderSelectedTags();
    }

    renderSelectedTags() {
        if (this.type !== 'tags') return;
        
        const container = document.getElementById('selectedTags');
        if (!container) return;
        
        container.innerHTML = this.selectedItems.map(tag => `
            <div class="selected-tag" data-tag-id="${tag.id}" style="background-color: ${tag.color}">
                <span>${tag.name}</span>
                <button type="button" class="remove-tag" data-tag-id="${tag.id}">&times;</button>
            </div>
        `).join('');
        
        // Add remove handlers
        container.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tagId = e.target.dataset.tagId;
                this.removeSelectedTag(tagId);
            });
        });
    }

    removeSelectedTag(tagId) {
        if (this.type !== 'tags') return;
        
        this.selectedItems = this.selectedItems.filter(tag => tag.id !== tagId);
        this.renderSelectedTags();
    }

    clearSelectedTags() {
        if (this.type !== 'tags') return;
        
        this.selectedItems = [];
        this.renderSelectedTags();
    }

    getSelectedTagIds() {
        if (this.type !== 'tags') return [];
        
        return this.selectedItems.map(tag => tag.id);
    }
}

// Create instances for tags and ingredients
const tagTypeahead = new TypeaheadSystem('tags', {
    containerSelector: '.tag-input-container'
});

const ingredientTypeahead = new TypeaheadSystem('ingredients', {
    containerSelector: '.ingredient-item'
});

// Tag system functions (using shared typeahead)
async function initializeTagInput() {
    const tagInput = document.getElementById('tagInput');
    const tagSuggestions = document.getElementById('tagSuggestions');
    
    if (!tagInput) {
        console.log('Tag input element not found');
        return;
    }
    
    console.log('Initializing tag input...');
    await tagTypeahead.initialize(tagInput, tagSuggestions);
}

function addSelectedTag(tag) {
    tagTypeahead.addSelectedTag(tag);
}

function removeSelectedTag(tagId) {
    tagTypeahead.removeSelectedTag(tagId);
}

function clearSelectedTags() {
    tagTypeahead.clearSelectedTags();
}

function getSelectedTagIds() {
    return tagTypeahead.getSelectedTagIds();
}

// Ingredient system functions (using shared typeahead)
async function initializeIngredientTypeahead(inputElement) {
    if (!inputElement) {
        console.log('No input element provided to initializeIngredientTypeahead');
        return;
    }
    
    const suggestionsContainer = inputElement.parentElement.querySelector('.ingredient-suggestions-container');
    if (!suggestionsContainer) {
        console.log('No suggestions container found for ingredient input');
        return;
    }
    
    console.log('Initializing ingredient typeahead for:', inputElement);
    await ingredientTypeahead.initialize(inputElement, suggestionsContainer);
}

// Function to refresh tags and ingredients data
async function refreshTagsAndIngredients() {
    try {
        // Refresh tags
        const tagsData = await api.getTags();
        app.tags = tagsData.tags;
        
        // Refresh ingredients
        const ingredientsData = await api.getIngredients();
        app.ingredients = ingredientsData.ingredients;
        
        // Refresh typeahead systems
        tagTypeahead.allItems = [];
        ingredientTypeahead.allItems = [];
        
        // Refresh ingredient filter data if it exists
        if (window.ingredientFilterState) {
            window.ingredientFilterState.allIngredients = app.ingredients;
        }
        
        console.log('Refreshed tags and ingredients data');
    } catch (error) {
        console.error('Error refreshing tags and ingredients:', error);
    }
}

// Export to global scope
window.TypeaheadSystem = TypeaheadSystem;
window.tagTypeahead = tagTypeahead;
window.ingredientTypeahead = ingredientTypeahead;
window.initializeTagInput = initializeTagInput;
window.addSelectedTag = addSelectedTag;
window.removeSelectedTag = removeSelectedTag;
window.clearSelectedTags = clearSelectedTags;
window.getSelectedTagIds = getSelectedTagIds;
window.initializeIngredientTypeahead = initializeIngredientTypeahead;
window.refreshTagsAndIngredients = refreshTagsAndIngredients;
