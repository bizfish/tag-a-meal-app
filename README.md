# Tag-a-Meal - Recipe Management Web App

A comprehensive recipe management web application built with Node.js, Express, and Supabase. Features include user authentication, recipe CRUD operations, image uploads, advanced search, unit conversions, and tagging system.

## Features

- **User Authentication**: Secure registration and login with Supabase Auth
- **Recipe Management**: Create, edit, copy, delete, and organize recipes
- **Image Uploads**: Upload and manage recipe photos with automatic optimization
- **Advanced Search**: Full-text search across recipes, ingredients, and tags
- **Unit Conversions**: Built-in unit converter for cooking measurements
- **Tagging System**: Organize recipes with colorful, descriptive tags
- **Ingredient Database**: Comprehensive ingredient management with categories
- **Rating System**: Rate and review recipes
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database and authentication
- **Multer** - File upload handling
- **Sharp** - Image processing
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware
- **Express Rate Limit** - Rate limiting

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **Font Awesome** - Icons
- **Inter Font** - Typography

### Database
- **PostgreSQL** (via Supabase) - Primary database
- **Row Level Security** - Data protection
- **Full-text Search** - Advanced search capabilities

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tag-a-meal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SESSION_SECRET=your_very_secure_session_secret_here
   PORT=3000
   NODE_ENV=development
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=./uploads
   ```

4. **Set up the database**
   ```bash
   npm run setup-db
   ```
   
   This will create all necessary tables, indexes, and Row Level Security policies in your Supabase database.

5. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Or for production:
   ```bash
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Database Management

### Available Scripts

- `npm run setup-db` - Initial database setup (creates tables, indexes, RLS policies)
- `npm run reset-db` - Reset database to default state (removes all user data)

### Database Reset

To reset your database to its original state (useful for testing or starting fresh):

```bash
npm run reset-db
```

⚠️ **Warning**: This will permanently delete ALL user data including recipes, users, ratings, and collections. Only default tags and ingredients will remain.

For detailed information about database reset functionality, see [DATABASE_RESET.md](DATABASE_RESET.md).

## Database Schema

The application uses the following main tables:

- **users** - User profiles (extends Supabase auth.users)
- **recipes** - Recipe information
- **ingredients** - Ingredient database
- **recipe_ingredients** - Recipe-ingredient relationships
- **tags** - Recipe tags
- **recipe_tags** - Recipe-tag relationships
- **recipe_ratings** - User ratings and reviews
- **recipe_collections** - User recipe collections
- **collection_recipes** - Collection-recipe relationships

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Recipes
- `GET /api/recipes` - Get public recipes
- `GET /api/recipes/my-recipes` - Get user's recipes
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `POST /api/recipes/:id/copy` - Copy recipe
- `POST /api/recipes/:id/rate` - Rate recipe

### Search
- `GET /api/search/global` - Global search
- `GET /api/search/recipes` - Advanced recipe search
- `POST /api/search/convert-units` - Unit conversion
- `GET /api/search/units` - Get available units

### Tags & Ingredients
- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create new tag
- `GET /api/ingredients` - Get all ingredients
- `POST /api/ingredients` - Create new ingredient

### File Upload
- `POST /api/upload/recipe-image` - Upload recipe image
- `POST /api/upload/avatar` - Upload user avatar

## Usage

### Getting Started

1. **Register an Account**: Click the user menu and select "Sign Up"
2. **Create Your First Recipe**: Navigate to "Create" and fill out the recipe form
3. **Upload Images**: Add photos to make your recipes more appealing
4. **Add Tags**: Organize recipes with descriptive tags
5. **Search and Discover**: Use the search bar to find recipes by name, ingredients, or tags

### Recipe Management

- **Create**: Use the recipe form to add new recipes with ingredients, instructions, and metadata
- **Edit**: Click "Edit Recipe" on any of your recipes to modify them
- **Copy**: Duplicate existing recipes to create variations
- **Delete**: Remove recipes you no longer need
- **Rate**: Rate and review recipes from other users

### Advanced Features

- **Unit Conversion**: Use the built-in converter for cooking measurements
- **Advanced Search**: Filter recipes by difficulty, cooking time, ingredients, and more
- **Image Management**: Upload, resize, and manage recipe photos

## Development

### Project Structure

```
tag-a-meal/
├── public/                    # Frontend files
│   ├── index.html            # Main HTML file
│   ├── styles.css            # CSS styles
│   ├── app-refactored.js     # Main application logic
│   └── js/                   # JavaScript modules
│       ├── api-service.js    # API communication
│       ├── navigation.js     # Navigation handling
│       ├── recipe-management.js # Recipe CRUD operations
│       ├── ui-utils.js       # UI utilities
│       ├── typeahead-system.js # Search typeahead
│       └── ingredient-filter.js # Ingredient filtering
├── routes/                   # API routes
│   ├── auth.js              # Authentication routes
│   ├── recipes.js           # Recipe routes
│   ├── ingredients.js       # Ingredient routes
│   ├── tags.js             # Tag routes
│   ├── upload.js           # File upload routes
│   └── search.js           # Search routes
├── scripts/                 # Utility scripts
│   ├── setup-database.js   # Database setup script
│   ├── reset-database.js   # Database reset script
│   └── reset-database.sql  # SQL reset queries
├── utils/                   # Utility modules
│   ├── database.js         # Database utilities
│   ├── supabase.js         # Supabase client
│   ├── validation.js       # Input validation
│   └── responses.js        # Response helpers
├── uploads/                 # File upload directory
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
├── Caddyfile              # Caddy web server config
├── DATABASE_RESET.md      # Database reset guide
└── README.md              # This file
```

### Adding New Features

1. **Backend**: Add new routes in the `routes/` directory
2. **Frontend**: Update the JavaScript modules in `public/js/`
3. **Database**: Modify the schema in `scripts/setup-database.js`
4. **Styling**: Add CSS to `public/styles.css`

### Security Features

- **Row Level Security**: Database-level access control
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: Protection against abuse
- **CSRF Protection**: Secure headers and session management
- **File Upload Security**: Type validation and size limits
- **Authentication**: Secure JWT-based authentication via Supabase

## Deployment

### Environment Setup

1. Set `NODE_ENV=production` in your environment
2. Use a secure `SESSION_SECRET`
3. Configure your Supabase project for production
4. Set up proper CORS settings
5. Configure file upload limits

### Using Caddy Web Server (Recommended)

This project includes a `Caddyfile` for deployment with Caddy web server:

1. **Install Caddy** and point your domain's DNS to your server
2. **Update the Caddyfile** with your domain name and email
3. **Start the application**: `npm start`
4. **Start Caddy**: `sudo caddy run --config Caddyfile`

Caddy provides automatic HTTPS, security headers, rate limiting, and performance optimizations.

### Alternative Hosting Options

- **Backend**: Heroku, Railway, DigitalOcean, or VPS with Caddy
- **Database**: Supabase (managed PostgreSQL)
- **File Storage**: Supabase Storage or AWS S3
- **CDN**: Cloudflare or AWS CloudFront

### Docker Deployment

For containerized deployment, you can use Docker with Caddy:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    ports:
      - "3000:3000"
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on the GitHub repository.
