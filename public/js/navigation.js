// Navigation and State Management Module

// Application State
class AppState {
    constructor() {
        this.user = null;
        this.token = localStorage.getItem('token');
        this.currentPage = 'home';
        this.recipes = [];
        this.tags = [];
        this.ingredients = [];
        this.currentRecipe = null;
        this.editingRecipe = null;
        this.copyingRecipe = null;
    }

    setUser(user) {
        this.user = user;
        this.updateUI();
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    updateUI() {
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (this.user) {
            if (userName) {
                userName.textContent = this.user.fullName || this.user.email;
            }
            if (userAvatar) {
                updateAvatarDisplay(userAvatar, this.user.avatarUrl, 'user');
            }
            this.showAuthenticatedUI();
        } else {
            if (userName) {
                userName.textContent = 'Guest';
            }
            if (userAvatar) {
                userAvatar.style.display = 'none';
                // Add Material Icons fallback for guest
                if (!userAvatar.nextElementSibling || !userAvatar.nextElementSibling.classList.contains('material-icons')) {
                    const iconFallback = document.createElement('span');
                    iconFallback.className = 'material-icons user-avatar-fallback';
                    iconFallback.textContent = 'account_circle';
                    iconFallback.style.cssText = 'font-size: 32px; color: var(--text-secondary); border-radius: 50%;';
                    userAvatar.parentNode.insertBefore(iconFallback, userAvatar.nextSibling);
                }
            }
            this.showGuestUI();
        }
    }

    showAuthenticatedUI() {
        document.getElementById('signInBtn').style.display = 'none';
        document.getElementById('userMenuContainer').style.display = 'block';
        
        // Show auth-required nav items
        document.querySelectorAll('[data-auth-required]').forEach(el => {
            el.style.display = 'flex';
        });
    }

    showGuestUI() {
        document.getElementById('signInBtn').style.display = 'block';
        document.getElementById('userMenuContainer').style.display = 'none';
        
        // Hide auth-required nav items
        document.querySelectorAll('[data-auth-required]').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Navigation Functions
function navigateToPage(pageId, skipUnsavedCheck = false) {
    // Check if user is trying to access auth-required pages without being signed in
    const authRequiredPages = ['my-recipes', 'create-recipe', 'profile'];
    if (authRequiredPages.includes(pageId) && !app.user) {
        showSignUpEncouragementModal('create');
        return;
    }

    // Check if we're leaving the create-recipe page with unsaved changes
    if (app.currentPage === 'create-recipe' && pageId !== 'create-recipe' && !skipUnsavedCheck) {
        if (hasUnsavedChanges()) {
            const confirmLeave = confirm('You have unsaved changes. Are you sure you want to leave this page?');
            if (!confirmLeave) {
                return; // Don't navigate away
            }
        }
        // Clear editing state when leaving create-recipe page
        clearEditingState();
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Convert kebab-case to camelCase for page IDs
    const pageIdMap = {
        'home': 'homePage',
        'recipes': 'recipesPage',
        'my-recipes': 'myRecipesPage',
        'create-recipe': 'createRecipePage',
        'recipe-detail': 'recipeDetailPage',
        'profile': 'profilePage'
    };

    const targetPageId = pageIdMap[pageId] || pageId + 'Page';
    const targetPage = document.getElementById(targetPageId);
    
    if (targetPage) {
        targetPage.classList.add('active');
        app.currentPage = pageId;

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navItem = document.querySelector(`[data-page="${pageId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Load page data
        loadPageData(pageId);
    } else {
        console.error(`Page not found: ${targetPageId} for pageId: ${pageId}`);
    }
}

function hasUnsavedChanges() {
    // Check if any form fields have been modified
    const form = document.getElementById('recipeForm');
    if (!form) return false;

    const title = document.getElementById('recipeTitle').value.trim();
    const description = document.getElementById('recipeDescription').value.trim();
    const instructions = document.getElementById('recipeInstructions').value.trim();
    
    // Check if there are any ingredients
    const ingredients = document.querySelectorAll('.ingredient-item');
    const hasIngredients = Array.from(ingredients).some(item => {
        const name = item.querySelector('.ingredient-name').value.trim();
        return name.length > 0;
    });

    // Consider it unsaved if there's any content
    return title.length > 0 || description.length > 0 || instructions.length > 0 || hasIngredients;
}

function clearEditingState() {
    // Clear the editing recipe state
    app.editingRecipe = null;
    
    // Reset form title
    document.getElementById('recipeFormTitle').textContent = 'Create New Recipe';
    
    // Reset form
    const form = document.getElementById('recipeForm');
    if (form) {
        form.reset();
    }
    
    // Clear ingredients list
    const ingredientsList = document.getElementById('ingredientsList');
    if (ingredientsList) {
        ingredientsList.innerHTML = '';
        addIngredientRow(); // Add one empty row
    }
    
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
    
    // Clear tag selections
    if (window.tagTypeahead) {
        tagTypeahead.clearSelectedTags();
    }
}

async function loadPageData(pageId) {
    try {
        switch (pageId) {
            case 'home':
                await loadHomePage();
                break;
            case 'recipes':
                await loadRecipesPage();
                break;
            case 'my-recipes':
                await loadMyRecipesPage();
                break;
            case 'create-recipe':
                await loadCreateRecipePage();
                break;
            case 'profile':
                await loadProfilePage();
                break;
        }
    } catch (error) {
        console.error('Error loading page data:', error);
        showToast('Failed to load page data', 'error');
    }
}

// Page Loaders
async function loadHomePage() {
    try {
        // Load public recipe count for front page
        const recipesData = await api.getRecipes({ limit: 1, publicOnly: true });
        document.getElementById('totalRecipes').textContent = recipesData.pagination?.total || '0';
        document.getElementById('totalUsers').textContent = '1,234';
        document.getElementById('totalTags').textContent = '45';
        document.getElementById('totalIngredients').textContent = '567';
    } catch (error) {
        console.error('Error loading home page:', error);
        // Fallback to 0 if there's an error
        document.getElementById('totalRecipes').textContent = '0';
    }
}

async function loadRecipesPage(params = {}) {
    try {
        const recipesData = await api.getRecipes(params);
        renderRecipeGrid(recipesData.recipes, 'recipesGrid');
        
        // Load tags for filters if not already loaded
        if (!app.tags || app.tags.length === 0) {
            const tagsData = await api.getTags();
            app.tags = tagsData.tags;
            renderTagFilters(app.tags);
        }
    } catch (error) {
        console.error('Error loading recipes page:', error);
        showToast('Failed to load recipes', 'error');
    }
}

async function loadMyRecipesPage() {
    if (!app.user) {
        showModal('authModal');
        return;
    }

    try {
        const recipesData = await api.getMyRecipes();
        renderRecipeGrid(recipesData.recipes, 'myRecipesGrid');
    } catch (error) {
        console.error('Error loading my recipes page:', error);
    }
}

async function loadCreateRecipePage() {
    if (!app.user) {
        showModal('authModal');
        return;
    }

    try {
        // Load tags and ingredients for the form
        const [tagsData, ingredientsData] = await Promise.all([
            api.getTags(),
            api.getIngredients()
        ]);
        
        app.tags = tagsData.tags;
        app.ingredients = ingredientsData.ingredients;
        
        renderRecipeTagsForm();
        renderIngredientsDatalist();
        
        // Reset form if not editing or copying
        if (!app.editingRecipe && !app.copyingRecipe) {
            document.getElementById('recipeForm').reset();
            document.getElementById('recipeFormTitle').textContent = 'Create New Recipe';
            clearIngredientsList();
        }
    } catch (error) {
        console.error('Error loading create recipe page:', error);
        showToast('Failed to load form data', 'error');
    }
}

async function loadProfilePage() {
    if (!app.user) {
        showModal('authModal');
        return;
    }

    try {
        const profileData = await api.getProfile();
        const user = profileData.user;
        
        document.getElementById('profileFullName').value = user.fullName || '';
        document.getElementById('profileEmail').value = user.email || '';
        
        // Fix profile avatar display
        const profileAvatar = document.getElementById('profileAvatar');
        const avatarContainer = profileAvatar?.parentElement;
        const removeAvatarBtn = document.getElementById('removeAvatarBtn');
        
        if (profileAvatar && avatarContainer) {
            if (user.avatarUrl) {
                profileAvatar.src = user.avatarUrl;
                profileAvatar.style.display = 'block';
                // Show remove button
                if (removeAvatarBtn) {
                    removeAvatarBtn.style.display = 'inline-block';
                }
                // Remove any Material Icons fallback
                const existingIcon = avatarContainer.querySelector('.material-icons');
                if (existingIcon) {
                    existingIcon.remove();
                }
            } else {
                profileAvatar.style.display = 'none';
                // Hide remove button
                if (removeAvatarBtn) {
                    removeAvatarBtn.style.display = 'none';
                }
                // Add Material Icons fallback if not already present
                let iconFallback = avatarContainer.querySelector('.material-icons');
                if (!iconFallback) {
                    iconFallback = document.createElement('span');
                    iconFallback.className = 'material-icons profile-avatar-fallback';
                    iconFallback.textContent = 'account_circle';
                    iconFallback.style.cssText = 'font-size: 120px; color: var(--text-secondary); width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-secondary);';
                    avatarContainer.insertBefore(iconFallback, profileAvatar.nextSibling);
                }
            }
        }
        
        document.getElementById('showAuthorName').checked = user.showAuthorName !== false;
    } catch (error) {
        console.error('Error loading profile page:', error);
    }
}

// Export to global scope
window.AppState = AppState;
window.navigateToPage = navigateToPage;
window.hasUnsavedChanges = hasUnsavedChanges;
window.clearEditingState = clearEditingState;
window.loadPageData = loadPageData;
window.loadHomePage = loadHomePage;
window.loadRecipesPage = loadRecipesPage;
window.loadMyRecipesPage = loadMyRecipesPage;
window.loadCreateRecipePage = loadCreateRecipePage;
window.loadProfilePage = loadProfilePage;
