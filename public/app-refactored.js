// Main Application - Refactored with Modular Components
// This is a streamlined version that coordinates between modular utilities

// Global Application State
let app;
let api;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize global state and API service
    app = new AppState();
    api = new ApiService();
    
    // Initialize the application
    await initializeApp();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial page
    navigateToPage('home');
});

// Initialize application
async function initializeApp() {
    try {
        // Check if user is already authenticated
        if (app.token) {
            const profileData = await api.getProfile();
            app.setUser(profileData.user);
        } else {
            // Ensure UI is updated for guest state
            app.updateUI();
        }
    } catch (error) {
        console.log('No valid session found');
        app.setToken(null);
        app.setUser(null);
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Navigation event listeners
    setupNavigationListeners();
    
    // Authentication event listeners
    setupAuthListeners();
    
    // Search event listeners
    setupSearchListeners();
    
    // Recipe form event listeners
    setupRecipeFormListeners();
    
    // Profile form event listeners
    setupProfileFormListeners();
    
    // Filter event listeners
    setupFilterListeners();
    
    // Modal event listeners
    setupModalListeners();
}

// Navigation Event Listeners
function setupNavigationListeners() {
    // Navigation buttons
    document.querySelectorAll('[data-page]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = button.getAttribute('data-page');
            navigateToPage(pageId);
        });
    });
    
    // User menu toggle - Fixed implementation
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle dropdown visibility
            if (userDropdown.style.display === 'block') {
                userDropdown.style.display = 'none';
            } else {
                userDropdown.style.display = 'block';
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.style.display = 'none';
            }
        });
    }
    
    // Profile and logout links
    const profileLink = document.getElementById('profileLink');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage('profile');
            userDropdown.style.display = 'none';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
            userDropdown.style.display = 'none';
        });
    }
}

// Authentication Event Listeners
function setupAuthListeners() {
    const signInBtn = document.getElementById('signInBtn');
    const authForm = document.getElementById('authForm');
    const authSwitchLink = document.getElementById('authSwitchLink');
    
    // Sign in button
    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            showModal('authModal');
        });
    }
    
    // Auth form submission
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
    
    // Switch between login and register
    if (authSwitchLink) {
        authSwitchLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode();
        });
    }
    
    // Sign up encouragement modal buttons
    const signUpFromEncouragement = document.getElementById('signUpFromEncouragement');
    const signInFromEncouragement = document.getElementById('signInFromEncouragement');
    
    if (signUpFromEncouragement) {
        signUpFromEncouragement.addEventListener('click', () => {
            hideModal('signUpEncouragementModal');
            showModal('authModal');
            setAuthMode('register');
        });
    }
    
    if (signInFromEncouragement) {
        signInFromEncouragement.addEventListener('click', () => {
            hideModal('signUpEncouragementModal');
            showModal('authModal');
            setAuthMode('login');
        });
    }
}

// Search Event Listeners
function setupSearchListeners() {
    const globalSearch = document.getElementById('globalSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (globalSearch && searchResults) {
        const debouncedSearch = debounce(async (query) => {
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            try {
                const results = await api.searchGlobal(query);
                renderSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
                searchResults.style.display = 'none';
            }
        }, 300);
        
        globalSearch.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });
        
        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!globalSearch.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
}

// Recipe Form Event Listeners
function setupRecipeFormListeners() {
    const recipeForm = document.getElementById('recipeForm');
    
    if (recipeForm) {
        recipeForm.addEventListener('submit', handleRecipeSubmit);
    }
    
    // Add ingredient button
    const addIngredientBtn = document.getElementById('addIngredientBtn');
    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', addIngredientRow);
    }
    
    // Image upload
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const recipeImage = document.getElementById('recipeImage');
    
    if (uploadImageBtn && recipeImage) {
        uploadImageBtn.addEventListener('click', () => {
            recipeImage.click();
        });
        
        recipeImage.addEventListener('change', handleImageUpload);
    }
    
    // Instructions preview
    const recipeInstructions = document.getElementById('recipeInstructions');
    const instructionsPreview = document.getElementById('instructionsPreview');
    
    if (recipeInstructions && instructionsPreview) {
        recipeInstructions.addEventListener('input', debounce((e) => {
            const markdown = e.target.value;
            if (markdown.trim()) {
                instructionsPreview.innerHTML = marked.parse(markdown);
            } else {
                instructionsPreview.innerHTML = '<div class="preview-placeholder" style="color: var(--text-secondary); font-style: italic; text-align: center; padding: 2rem;">Start typing above to see preview...</div>';
            }
        }, 300));
    }
}

// Profile Form Event Listeners
function setupProfileFormListeners() {
    const profileForm = document.getElementById('profileForm');
    
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Avatar upload
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    
    if (changeAvatarBtn && avatarInput) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarInput.click();
        });
        
        avatarInput.addEventListener('change', handleAvatarUpload);
    }
    
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', handleRemoveAvatar);
    }
}

// Filter Event Listeners
function setupFilterListeners() {
    // Difficulty filter
    const difficultyFilter = document.getElementById('difficultyFilter');
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', filterRecipes);
    }
    
    // Sort by filter
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', filterRecipes);
    }
}

// Modal Event Listeners
function setupModalListeners() {
    // Close modal buttons
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Authentication Functions
async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const isRegister = document.getElementById('registerFields').style.display !== 'none';
    
    try {
        if (isRegister) {
            const fullName = document.getElementById('authFullName').value;
            const confirmPassword = document.getElementById('authConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            const result = await api.register(email, password, fullName);
            
            if (result.session) {
                // User is immediately signed in
                app.setToken(result.session.access_token);
                app.setUser(result.user);
                hideModal('authModal');
                showToast('Registration successful!', 'success');
            } else {
                // Email verification required
                document.getElementById('verificationEmail').textContent = email;
                hideModal('authModal');
                showModal('emailVerificationModal');
            }
        } else {
            const result = await api.login(email, password);
            app.setToken(result.session.access_token);
            app.setUser(result.user);
            hideModal('authModal');
            showToast('Welcome back!', 'success');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function toggleAuthMode() {
    const registerFields = document.getElementById('registerFields');
    const isRegister = registerFields.style.display !== 'none';
    
    if (isRegister) {
        setAuthMode('login');
    } else {
        setAuthMode('register');
    }
}

function setAuthMode(mode) {
    const registerFields = document.getElementById('registerFields');
    const authModalTitle = document.getElementById('authModalTitle');
    const authSubmitText = document.getElementById('authSubmitText');
    const authSwitchText = document.getElementById('authSwitchText');
    
    if (mode === 'register') {
        registerFields.style.display = 'block';
        authModalTitle.textContent = 'Sign Up';
        authSubmitText.textContent = 'Sign Up';
        authSwitchText.innerHTML = 'Already have an account? <a href="#" id="authSwitchLink">Sign in</a>';
    } else {
        registerFields.style.display = 'none';
        authModalTitle.textContent = 'Sign In';
        authSubmitText.textContent = 'Sign In';
        authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink">Sign up</a>';
    }
    
    // Re-attach event listener to new link
    const newAuthSwitchLink = document.getElementById('authSwitchLink');
    if (newAuthSwitchLink) {
        newAuthSwitchLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode();
        });
    }
}

async function logout() {
    try {
        await api.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        app.setToken(null);
        app.setUser(null);
        navigateToPage('home');
        showToast('Signed out successfully', 'success');
    }
}

// Recipe Functions
async function handleRecipeSubmit(e) {
    e.preventDefault();
    
    const formData = getRecipeFormData();
    
    try {
        if (app.editingRecipe) {
            await api.updateRecipe(app.editingRecipe.id, formData);
            showToast('Recipe updated successfully!', 'success');
        } else {
            await api.createRecipe(formData);
            showToast('Recipe created successfully!', 'success');
        }
        
        // Refresh tags and ingredients data after recipe creation/update
        await refreshTagsAndIngredients();
        
        clearEditingState();
        navigateToPage('my-recipes');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Profile Functions
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = {
        fullName: document.getElementById('profileFullName').value,
        showAuthorName: document.getElementById('showAuthorName').checked
    };
    
    try {
        const result = await api.updateProfile(formData);
        app.setUser(result.user);
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// File Upload Functions
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const result = await api.uploadRecipeImage(file);
        
        // Update image preview
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = `
            <img src="${result.imageUrl}" alt="Recipe preview" style="max-width: 100%; height: auto; border-radius: 8px;">
            <button type="button" class="btn btn-secondary" onclick="removeRecipeImage()">
                <i class="fas fa-trash"></i> Remove Image
            </button>
        `;
        
        // Store image URL
        let imageUrlInput = document.getElementById('recipeImageUrl');
        if (!imageUrlInput) {
            imageUrlInput = document.createElement('input');
            imageUrlInput.type = 'hidden';
            imageUrlInput.id = 'recipeImageUrl';
            document.getElementById('recipeForm').appendChild(imageUrlInput);
        }
        imageUrlInput.value = result.imageUrl;
        
        showToast('Image uploaded successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const result = await api.uploadAvatar(file);
        
        // Update avatar display
        const profileAvatar = document.getElementById('profileAvatar');
        updateAvatarDisplay(profileAvatar, result.avatarUrl, 'profile');
        
        // Update user state
        app.user.avatarUrl = result.avatarUrl;
        app.updateUI();
        
        showToast('Avatar updated successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleRemoveAvatar() {
    try {
        await api.updateProfile({ avatarUrl: null });
        
        // Update avatar display
        const profileAvatar = document.getElementById('profileAvatar');
        updateAvatarDisplay(profileAvatar, null, 'profile');
        
        // Update user state
        app.user.avatarUrl = null;
        app.updateUI();
        
        showToast('Avatar removed successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Filter Functions
function renderTagFilters(tags) {
    const container = document.getElementById('tagFilters');
    if (!container) return;

    container.innerHTML = tags.map(tag => `
        <span class="tag-filter" data-tag="${tag.name}" style="border-color: ${tag.color}">
            ${tag.name}
        </span>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.tag-filter').forEach(filter => {
        filter.addEventListener('click', () => {
            filter.classList.toggle('active');
            filterRecipes();
        });
    });
}

async function filterRecipes() {
    const difficulty = document.getElementById('difficultyFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    const activeTags = Array.from(document.querySelectorAll('.tag-filter.active'))
        .map(filter => filter.dataset.tag);
    
    // Get ingredient filters from the ingredient filter module
    const ingredientParams = getIngredientFilterParams();
    
    const params = {};
    if (difficulty) params.difficulty = difficulty;
    if (activeTags.length > 0) params.tags = activeTags.join(',');
    if (sortBy) params.sortBy = sortBy;
    
    // Merge ingredient filter params
    Object.assign(params, ingredientParams);
    
    try {
        const recipesData = await api.searchRecipes(params);
        renderRecipeGrid(recipesData.recipes, 'recipesGrid');
    } catch (error) {
        showToast('Failed to filter recipes', 'error');
    }
}

// Search Functions
function renderSearchResults(results) {
    const container = document.getElementById('searchResults');
    
    if (results.totalResults === 0) {
        container.innerHTML = '<div style="padding: 1rem; text-align: center;">No results found</div>';
        container.style.display = 'block';
        return;
    }
    
    let html = '';
    
    if (results.results.recipes.length > 0) {
        html += '<div style="padding: 0.5rem; font-weight: 600; border-bottom: 1px solid var(--border-color);">Recipes</div>';
        results.results.recipes.forEach(recipe => {
            html += `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="viewRecipe('${recipe.id}')">
                    <div style="font-weight: 500;">${recipe.title}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">${recipe.description || ''}</div>
                </div>
            `;
        });
    }
    
    if (results.results.ingredients.length > 0) {
        html += '<div style="padding: 0.5rem; font-weight: 600; border-bottom: 1px solid var(--border-color);">Ingredients</div>';
        results.results.ingredients.forEach(ingredient => {
            html += `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
                    <div style="font-weight: 500;">${ingredient.name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">${ingredient.category || 'Uncategorized'}</div>
                </div>
            `;
        });
    }
    
    if (results.results.tags.length > 0) {
        html += '<div style="padding: 0.5rem; font-weight: 600; border-bottom: 1px solid var(--border-color);">Tags</div>';
        results.results.tags.forEach(tag => {
            html += `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
                    <span class="tag" style="background-color: ${tag.color}">${tag.name}</span>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// Page Loading Functions
async function loadRecipesPage(params = {}) {
    try {
        const recipesData = await api.getRecipes(params);
        renderRecipeGrid(recipesData.recipes, 'recipesGrid');
        
        // Load tags for filters if not already loaded
        if (!app.tags || app.tags.length === 0) {
            const tagsData = await api.getTags();
            app.tags = tagsData.tags;
            renderTagFilters(app.tags);
        } else {
            renderTagFilters(app.tags);
        }
        
        // Initialize ingredient filter system
        await initializeIngredientFilter();
    } catch (error) {
        console.error('Error loading recipes page:', error);
        showToast('Failed to load recipes', 'error');
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions that need to be globally accessible
window.filterRecipes = filterRecipes;
window.loadRecipesPage = loadRecipesPage;
window.renderTagFilters = renderTagFilters;
