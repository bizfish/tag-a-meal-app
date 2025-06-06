// UI Utilities Module

// Loading and Toast Functions
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}

function showToast(message, type = 'success', title = '') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
        <i class="toast-icon ${iconMap[type] || iconMap.info}"></i>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto remove after 5 seconds
    const autoRemove = setTimeout(() => removeToast(toast), 5000);

    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoRemove);
        removeToast(toast);
    });
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

function showSignUpEncouragementModal(context = 'create') {
    const modal = document.getElementById('signUpEncouragementModal');
    const title = modal.querySelector('.modal-header h2');
    
    if (context === 'recipe') {
        title.textContent = 'Sign Up to View Full Recipe Details';
    } else {
        title.textContent = 'Join Tag-a-Meal to Create and Manage Recipes';
    }
    
    showModal('signUpEncouragementModal');
}

// Avatar Display Functions
function updateAvatarDisplay(avatarElement, avatarUrl, type = 'user') {
    if (!avatarElement) return;
    
    if (avatarUrl) {
        avatarElement.src = avatarUrl;
        avatarElement.style.display = 'block';
        avatarElement.nextElementSibling?.remove(); // Remove any icon fallback
    } else {
        avatarElement.style.display = 'none';
        // Add Material Icons fallback if not already present
        if (!avatarElement.nextElementSibling || !avatarElement.nextElementSibling.classList.contains('material-icons')) {
            const iconFallback = document.createElement('span');
            iconFallback.className = `material-icons ${type}-avatar-fallback`;
            iconFallback.textContent = 'account_circle';
            
            const size = type === 'profile' ? '120px' : '32px';
            iconFallback.style.cssText = `font-size: ${size}; color: var(--text-secondary); border-radius: 50%; ${type === 'profile' ? 'width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: var(--background-secondary);' : ''}`;
            
            avatarElement.parentNode.insertBefore(iconFallback, avatarElement.nextSibling);
        }
    }
}

// Recipe Card Rendering
function renderRecipeCard(recipe, isMyRecipes = false) {
    const isOwner = app.user && app.user.id === recipe.user_id;
    
    // Get author name - for My Recipes, show current user's name, otherwise show recipe author
    let authorName;
    let authorAvatar;
    
    if (isMyRecipes && isOwner) {
        // For My Recipes page, show current user's info
        authorName = app.user?.fullName || app.user?.email || 'You';
        authorAvatar = app.user?.avatarUrl;
    } else {
        // For public recipes or other users' recipes
        authorName = recipe.users?.full_name || recipe.user?.full_name || 'Anonymous';
        authorAvatar = recipe.users?.avatar_url;
        
        // Only show author info if they allow name display
        if (recipe.users?.show_author_name === false) {
            authorName = 'Anonymous';
            authorAvatar = null;
        }
    }
    
    // Determine badge type
    let badgeClass = '';
    let badgeText = '';
    if (isOwner) {
        if (recipe.is_public) {
            badgeClass = 'public';
            badgeText = 'PUBLIC';
        } else {
            badgeClass = 'private';
            badgeText = 'PRIVATE';
        }
    } else {
        badgeClass = 'other-user';
        badgeText = 'SHARED';
    }
    
    return `
        <div class="recipe-card" data-recipe-id="${recipe.id}">
            <div class="recipe-badge ${badgeClass}">${badgeText}</div>
            <img src="${recipe.image_url || '/api/placeholder-recipe'}" alt="${recipe.title}" class="recipe-image">
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.title}</h3>
                <p class="recipe-description">${recipe.description || ''}</p>
                <div class="recipe-meta">
                    <span><i class="fas fa-clock"></i> ${recipe.prep_time || 0}+${recipe.cook_time || 0} min</span>
                    <span><i class="fas fa-users"></i> ${recipe.servings || 1} servings</span>
                    <span class="difficulty-${recipe.difficulty}">${recipe.difficulty || 'easy'}</span>
                </div>
                <div class="recipe-tags">
                    ${(recipe.recipe_tags || []).map(rt => 
                        `<span class="tag" style="background-color: ${rt.tags?.color || '#3B82F6'}">${rt.tags?.name || rt.tag_name || ''}</span>`
                    ).join('')}
                </div>
                <div class="recipe-footer">
                    <div class="recipe-author">
                        ${authorAvatar ? 
                            `<img src="${authorAvatar}" alt="" class="author-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <span class="material-icons author-avatar-icon" style="font-size: 24px; color: var(--text-secondary); width: 24px; height: 24px; display: none; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-secondary);">account_circle</span>` : 
                            `<span class="material-icons author-avatar-icon" style="font-size: 24px; color: var(--text-secondary); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-secondary);">account_circle</span>`
                        }
                        <span>${authorName}</span>
                    </div>
                    <div class="recipe-actions">
                        ${isMyRecipes && isOwner ? `
                            <button class="btn btn-sm btn-primary recipe-edit-btn" data-recipe-id="${recipe.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : (!isOwner && app.user) ? `
                            <button class="btn btn-sm btn-secondary recipe-copy-btn" data-recipe-id="${recipe.id}">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        ` : ''}
                        <div class="recipe-rating">
                            <i class="fas fa-star"></i>
                            <span>${recipe.averageRating?.toFixed(1) || '0.0'}</span>
                            <span>(${recipe.totalRatings || 0})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderRecipeGrid(recipes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<p class="text-center">No recipes found.</p>';
        return;
    }

    const isMyRecipes = containerId === 'myRecipesGrid';

    // Use shared recipe card rendering function
    container.innerHTML = recipes.map(recipe => renderRecipeCard(recipe, isMyRecipes)).join('');

    // Add event listeners for recipe cards
    container.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const recipeId = card.dataset.recipeId;
            viewRecipe(recipeId);
        });
    });

    // Add event listeners for action buttons
    container.querySelectorAll('.recipe-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const recipeId = btn.dataset.recipeId;
            editRecipe(recipeId);
        });
    });

    container.querySelectorAll('.recipe-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const recipeId = btn.dataset.recipeId;
            copyAndEditRecipe(recipeId);
        });
    });
}

// Search Results Rendering
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

// Export functions to global scope
window.showLoading = showLoading;
window.showToast = showToast;
window.removeToast = removeToast;
window.showModal = showModal;
window.hideModal = hideModal;
window.showSignUpEncouragementModal = showSignUpEncouragementModal;
window.updateAvatarDisplay = updateAvatarDisplay;
window.renderRecipeCard = renderRecipeCard;
window.renderRecipeGrid = renderRecipeGrid;
window.renderSearchResults = renderSearchResults;
window.debounce = debounce;
