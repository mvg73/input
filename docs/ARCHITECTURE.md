# Data Input Portal - Architecture Documentation

## Overview

A web application for collecting validated data from customer organizations aligned to projects. Built with Vanilla JS/HTML/CSS using localStorage for the demo phase, designed for AWS migration.

## Current Architecture (Phase 1 - Local Storage)

### Technology Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: Browser localStorage
- **Authentication**: Email lookup (session stored in sessionStorage)
- **No build tools required** - runs directly in browser

### File Structure

```
/
├── index.html                    # Login page
├── css/
│   └── styles.css               # All application styles
├── js/
│   ├── storage.js               # localStorage CRUD operations
│   ├── auth.js                  # Authentication/session management
│   ├── app.js                   # Main app controller
│   └── validation.js            # Data validation logic
├── pages/
│   ├── customer-dashboard.html  # Project selection for customers
│   ├── data-entry.html          # Data entry form with validation
│   ├── wrangler-dashboard.html  # Admin dashboard
│   ├── manage-expectations.html # CRUD for data set expectations
│   ├── manage-projects.html     # CRUD for projects
│   ├── manage-organizations.html # CRUD for organizations
│   ├── manage-links.html        # Link management
│   └── review-data.html         # View collected data
└── docs/
    └── ARCHITECTURE.md          # This file
```

### Data Model

#### Organizations
```javascript
{
  id: string,           // Auto-generated
  name: string,         // Organization display name
  principal: string,    // Contact person name
  email: string,        // Login email (unique)
  isWrangler: boolean   // Admin access flag
}
```

#### Data Set Expectations
```javascript
{
  id: string,
  name: string,         // e.g., "ZULU100"
  columns: [
    {
      name: string,     // Column/field name
      nullsOk: boolean, // Allow empty values
      mustBeInt: boolean // Require integer values
    }
  ]
}
```

#### Projects
```javascript
{
  id: string,
  name: string          // Project display name
}
```

#### Organization-Project Links
```javascript
{
  orgId: string,
  projectId: string
}
```

#### Project-Expectation Links
```javascript
{
  projectId: string,
  expectationId: string
}
```

#### Collected Data
```javascript
{
  id: string,
  orgId: string,
  projectId: string,
  expectationId: string,
  data: { [columnName]: value },
  timestamp: string     // ISO date string
}
```

### User Flows

#### Customer Journey
1. Login with organization email
2. See list of assigned projects
3. Select project
4. Enter data for each linked expectation
5. Data is validated on field blur and form submit
6. Logout

#### Wrangler Journey
1. Login with wrangler organization email
2. Access admin dashboard
3. CRUD operations for:
   - Data Set Expectations (define columns)
   - Projects
   - Organizations
   - Links (org↔project, expectation↔project)
4. Review collected data with filters

### Key Modules

#### storage.js
Single point of access for all data operations. Designed for easy replacement with API calls.

Key methods:
- `getOrganizations()`, `saveOrganization()`, `deleteOrganization()`
- `getProjects()`, `saveProject()`, `deleteProject()`
- `getExpectations()`, `saveExpectation()`, `deleteExpectation()`
- `linkOrgToProject()`, `unlinkOrgFromProject()`
- `linkExpectationToProject()`, `unlinkExpectationFromProject()`
- `getCollectedData()`, `saveCollectedData()`, `deleteCollectedData()`

#### auth.js
Session management using sessionStorage.

Key methods:
- `login(email)` - Lookup org by email, create session
- `logout()` - Clear session, redirect
- `getCurrentUser()` - Get logged-in user
- `isWrangler()` - Check admin access
- `requireLogin()`, `requireWrangler()` - Route guards

#### validation.js
Data validation against column definitions.

Key methods:
- `validateValue(value, column)` - Single value validation
- `validateData(data, columns)` - Full dataset validation
- `getColumnRequirements(column)` - Human-readable requirements

---

## AWS Migration Path (Phase 2)

### Target Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CloudFront    │────▶│    S3 Bucket    │     │    Cognito      │
│   (CDN)         │     │  (Static Host)  │     │  (Auth)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│   Lambda        │────▶│   DynamoDB      │
│   (REST API)    │     │  (Functions)    │     │   (Data)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### AWS Services Mapping

| Current Component | AWS Service | Purpose |
|-------------------|-------------|---------|
| Static files | S3 + CloudFront | Host HTML/CSS/JS |
| localStorage | DynamoDB | Data storage |
| Email login | Cognito | Authentication |
| storage.js | API Gateway + Lambda | API endpoints |
| File upload | S3 | Store uploaded data files |

### Migration Steps

#### Step 1: Infrastructure Setup
1. Create DynamoDB tables matching current data model
2. Set up Cognito User Pool
3. Create S3 bucket for static hosting
4. Configure CloudFront distribution

#### Step 2: Backend API
1. Create Lambda functions for each CRUD operation
2. Set up API Gateway routes
3. Configure Cognito authorizer on API Gateway

#### Step 3: Frontend Updates
1. Replace `storage.js` with `api.js` that calls API Gateway
2. Replace `auth.js` with Cognito SDK integration
3. Update session handling for JWT tokens

#### Step 4: Data Migration
1. Export localStorage data to JSON
2. Import into DynamoDB tables

### DynamoDB Table Design

**Single-table design** for efficiency:

| PK | SK | Attributes |
|----|-----|------------|
| ORG#{id} | METADATA | name, principal, email, isWrangler |
| PROJECT#{id} | METADATA | name |
| EXPECTATION#{id} | METADATA | name, columns[] |
| PROJECT#{id} | ORG#{orgId} | (link record) |
| PROJECT#{id} | EXP#{expId} | (link record) |
| DATA#{id} | METADATA | orgId, projectId, expectationId, data, timestamp |

GSI for queries:
- GSI1: `orgId` → find projects/data for org
- GSI2: `projectId` → find expectations/orgs/data for project

### API Endpoints

```
POST   /auth/login              # Cognito authentication
GET    /organizations           # List all
POST   /organizations           # Create
PUT    /organizations/{id}      # Update
DELETE /organizations/{id}      # Delete

GET    /projects
POST   /projects
PUT    /projects/{id}
DELETE /projects/{id}

GET    /expectations
POST   /expectations
PUT    /expectations/{id}
DELETE /expectations/{id}

POST   /links/org-project       # { orgId, projectId }
DELETE /links/org-project       # { orgId, projectId }
POST   /links/exp-project       # { expectationId, projectId }
DELETE /links/exp-project       # { expectationId, projectId }

GET    /data?projectId=&orgId=  # Query with filters
POST   /data                    # Submit data entry
DELETE /data/{id}               # Delete entry
```

### Cost Estimation (Small Scale)

| Service | Estimated Monthly Cost |
|---------|------------------------|
| S3 + CloudFront | ~$1-5 |
| DynamoDB (on-demand) | ~$1-10 |
| Lambda | ~$0-5 |
| API Gateway | ~$1-5 |
| Cognito | Free tier (50k MAU) |
| **Total** | **~$5-25/month** |

---

## Running Locally

1. Open `index.html` in a browser
2. Create a wrangler organization first (use browser console):
   ```javascript
   Storage.saveOrganization({
     name: 'Admin',
     principal: 'Admin User',
     email: 'admin@example.com',
     isWrangler: true
   });
   ```
3. Login with `admin@example.com`
4. Create test data per requirements

## Testing the Validation (Per Requirements)

1. Create org "BABA" with email `baba@example.com`
2. Create project "Preciousiuoisty"
3. Create expectation "ZULU100" with column "TheCount" (mustBeInt: true, nullsOk: false)
4. Link ZULU100 to Preciousiuoisty
5. Link BABA to Preciousiuoisty
6. Logout, login as `baba@example.com`
7. Select Preciousiuoisty project
8. Enter "Z" for TheCount
9. Verify error: "TheCount must be a whole number (integer). You entered 'Z' which is not valid."
