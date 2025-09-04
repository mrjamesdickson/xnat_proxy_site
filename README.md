# XNAT React Application

A modern, fully-functional React.js application that interfaces with XNAT REST APIs to provide a fresh, intuitive user interface for managing neuroimaging data.

## Features

### 🔐 Authentication & Security
- Secure login with username/password
- Session management with automatic token refresh
- Persistent authentication across browser sessions
- Secure credential storage

### 📊 Data Management
- **Projects**: Browse, create, and manage XNAT projects
- **Subjects**: View and manage study participants/subjects
- **Experiments**: Browse imaging sessions and experiments
- **Scans**: View and manage individual scans and imaging data
- **Resources**: Handle file uploads and downloads

### 🔍 Advanced Features
- **Search**: Full-text search across projects, subjects, and experiments
- **Filtering**: Advanced filtering by project, modality, date ranges
- **Upload**: Drag-and-drop file upload interface for DICOM and other formats
- **User Management**: View user profiles and permissions
- **Settings**: Configure XNAT server connections

### 🎨 Modern UI/UX
- Responsive design that works on desktop and mobile
- Clean, intuitive interface with Tailwind CSS styling
- Loading states and error handling
- Real-time data updates with React Query
- Accessibility-compliant components

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Query for server state
- **HTTP Client**: Axios with comprehensive XNAT API coverage
- **Icons**: Lucide React icon library
- **Routing**: React Router DOM

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Access to an XNAT server
- Modern web browser

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173`

### First Time Setup

1. **Access the login page** - you'll see a clean login interface with the demo server pre-configured
2. **Enter your XNAT credentials:**
   - **Server URL**: Pre-filled with `http://demo02.xnatworks.io` (or change to your XNAT server)
   - **Username**: Your XNAT username
   - **Password**: Your XNAT password
3. **Click "Sign in"** - the app will authenticate and store your session

### Demo Server

The application comes pre-configured with the XNAT demo server at `http://demo02.xnatworks.io`. This allows you to test the application immediately without setting up your own XNAT instance.

**Demo Credentials:**
- **Server**: `http://demo02.xnatworks.io`
- **Username**: `admin`
- **Password**: `admin`

These credentials are pre-filled in development mode for easy testing.

## XNAT API Coverage

This application implements comprehensive XNAT REST API functionality:

### Core Data Operations
- ✅ **Authentication**: Login/logout with session management
- ✅ **Projects**: CRUD operations for project management
- ✅ **Subjects**: Browse and manage study subjects
- ✅ **Experiments**: Access imaging sessions and experiments
- ✅ **Scans**: View and manage individual scans
- ✅ **Resources**: File and resource management

### Advanced Features
- ✅ **File Operations**: Upload, download, and delete files
- ✅ **Search**: Flexible search across data types
- ✅ **User Management**: User profiles and permissions
- ✅ **System Info**: Server status and version information

### API Client Features
- Automatic request/response interceptors
- Error handling and retry logic
- TypeScript interfaces for all data types
- Configurable base URLs and authentication methods
- Support for both username/password and session-based auth

## Project Structure

```
src/
├── components/           # React components
│   ├── Dashboard.tsx    # Main dashboard view
│   ├── Projects.tsx     # Project management interface
│   ├── Subjects.tsx     # Subject browsing and management
│   ├── Experiments.tsx  # Experiment/session browser
│   ├── Upload.tsx       # File upload interface
│   ├── Search.tsx       # Search functionality
│   ├── Settings.tsx     # App configuration
│   ├── Login.tsx        # Authentication interface
│   └── Layout.tsx       # Main app layout and navigation
├── contexts/            # React contexts
│   └── XnatContext.tsx  # XNAT authentication and configuration
├── providers/           # Context providers
│   └── QueryProvider.tsx # React Query configuration
├── services/            # API services
│   └── xnat-api.ts      # Comprehensive XNAT API client
└── App.tsx             # Main application component
```

## Configuration

### Environment Variables

Create a `.env` file for default configurations:

```env
VITE_DEFAULT_XNAT_URL=http://demo02.xnatworks.io
VITE_APP_NAME="XNAT Portal"
```

The application includes a `.env` file with the demo server pre-configured. You can modify this to point to your own XNAT server.

### Customization

The application is designed to be easily customizable:

- **Styling**: Modify `tailwind.config.js` for custom themes
- **API Client**: Extend `src/services/xnat-api.ts` for custom endpoints
- **Components**: All components are modular and reusable
- **Routing**: Add new routes in `src/App.tsx`

## Deployment

### Production Build

```bash
npm run build
```

The build artifacts will be generated in the `dist/` directory.

### Docker Deployment

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Static Hosting

The built application is a static site that can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

## Security Considerations

- **HTTPS Only**: Always use HTTPS in production
- **CORS**: Configure your XNAT server for appropriate CORS settings
- **Authentication**: Sessions are stored securely in localStorage
- **API Keys**: Never expose API credentials in client-side code

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## XNAT Server Compatibility

This application is compatible with:
- XNAT 1.7.x
- XNAT 1.8.x
- XNAT Cloud instances
- Custom XNAT deployments with standard REST API

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## XNAT Server Configuration

### CORS Configuration for External XNAT Servers

If you're connecting to an external XNAT server (not localhost), you'll need to configure CORS headers on your XNAT server to allow requests from the React application.

#### For XNAT Administrators

Add the following to your XNAT server configuration:

1. **Tomcat Configuration** (`$TOMCAT_HOME/conf/web.xml`):
```xml
<filter>
    <filter-name>CorsFilter</filter-name>
    <filter-class>org.apache.catalina.filters.CorsFilter</filter-class>
    <init-param>
        <param-name>cors.allowed.origins</param-name>
        <param-value>http://localhost:5173,http://localhost:3000,https://your-app-domain.com</param-value>
    </init-param>
    <init-param>
        <param-name>cors.allowed.methods</param-name>
        <param-value>GET,POST,HEAD,OPTIONS,PUT,DELETE</param-value>
    </init-param>
    <init-param>
        <param-name>cors.allowed.headers</param-name>
        <param-value>Content-Type,X-Requested-With,Accept,Authorization,Cache-Control,Cookie</param-value>
    </init-param>
    <init-param>
        <param-name>cors.support.credentials</param-name>
        <param-value>true</param-value>
    </init-param>
</filter>
<filter-mapping>
    <filter-name>CorsFilter</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

2. **XNAT Properties** (`$XNAT_HOME/config/xnat-conf.properties`):
```properties
# Allow cross-origin requests
security.cors.enabled=true
security.cors.allowed-origins=http://localhost:5173,https://your-app-domain.com
security.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
security.cors.allowed-headers=*
security.cors.allow-credentials=true
```

3. **Development Proxy** (Alternative):
For development, this application includes a proxy configuration. Update `vite.config.ts` to point to your XNAT server:

```typescript
server: {
  proxy: {
    '/api/xnat': {
      target: 'https://your-xnat-server.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/xnat/, ''),
    },
  },
},
```

## Troubleshooting

### Common Issues

**Login fails with CORS error:**
- Ensure your XNAT server has proper CORS headers configured (see above)
- Check that the server URL is correct and accessible
- In development, the app will show a blue notice about CORS configuration
- For localhost XNAT servers, CORS is usually not an issue

**Data doesn't load:**
- Verify your user has appropriate permissions in XNAT
- Check browser console for detailed error messages
- Ensure the XNAT server is running and accessible

**Connection timeouts:**
- Check your network connection
- Verify the XNAT server URL is correct
- Ensure firewall settings allow the connection

**Build fails:**
- Ensure you have Node.js 18+ installed
- Clear `node_modules` and run `npm install` again

### Support

For issues and questions:
- Check the browser console for error messages
- Verify XNAT server connectivity and permissions
- Review the XNAT REST API documentation

## License

This project is open source. Please check the LICENSE file for details.

---

**Built with ❤️ for the XNAT community**

This application demonstrates the full capabilities of XNAT's REST API in a modern, user-friendly interface. It serves as both a functional tool and a reference implementation for XNAT web application development.
