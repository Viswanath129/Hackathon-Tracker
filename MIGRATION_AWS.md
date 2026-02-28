# AWS-Centric Serverless Migration Plan

## 🎯 Objective
Transition the Hackathon Tracker from a MERN stack to a fully managed AWS architecture using Lambda, API Gateway, DynamoDB, and Cognito.

## 🏗️ Reconfigured Architecture

| Component | Legacy (Current) | AWS Target | Purpose |
| :--- | :--- | :--- | :--- |
| **Hosting** | Local/Express | **AWS Amplify** | CDN-backed React hosting with automated CI/CD. |
| **Backend** | Express.js | **AWS Lambda** | Event-driven serverless logic. |
| **API Layer** | Express Router | **API Gateway** | Managed HTTP endpoints with CORS & Throttling. |
| **Database** | MongoDB | **DynamoDB** | Sub-millisecond latency NoSQL storage. |
| **Auth** | JWT / Bcrypt | **Cognito** | Managed User Pools with built-in RBAC. |
| **Real-time** | REST Polling | **Kinesis + IoT** | Streaming progress logs for live tracking. |

## 📊 DynamoDB Schema (One-Table Design)
We will use a single table named `HackathonTracker` to minimize cost and maximize performance.

| Entity | PK (Partition Key) | SK (Sort Key) | Attributes |
| :--- | :--- | :--- | :--- |
| **User (Team)** | `USER#<email>` | `METADATA` | `team_name`, `role`, `college`, `skills`, `members` |
| **Hackathon** | `USER#<email>` | `HACK#<id>` | `name`, `start_date`, `end_date` |
| **Project** | `HACK#<id>` | `PROJ#<id>` | `title`, `description`, `status`, `progress` |
| **Report** | `PROJ#<id>` | `ARTIFACT#<id>` | `file_url`, `rating`, `feedback` |
| **Issue** | `USER#<email>` | `ISSUE#<id>` | `title`, `description`, `status`, `image_url` |
| **Progress_Log** | `PROJ#<id>` | `LOG#<timestamp>` | `update_text`, `delta_percentage` |

## 🛠️ Step-by-Step Execution phases

### Phase 1: Storage & Database Foundation (Current Focus)
1.  [ ] Install AWS SDK for DynamoDB.
2.  [ ] Create DynamoDB Table via AWS CLI.
3.  [ ] Implement `dynamoClient.js` abstraction.
4.  [ ] Migrate data access logic from Mongoose to DynamoDB.

### Phase 2: Serverless Logic (Lambda)
1.  [ ] Setup AWS SAM (Serverless Application Model).
2.  [ ] Refactor Express routes into standalone Lambda handlers.
3.  [ ] Configure `template.yaml` for infrastructure as code.

### Phase 3: Identity Management (Cognito)
1.  [ ] Create Cognito User Pool.
2.  [ ] Update Frontend `AuthContext` to use AWS Amplify Auth SDK.
3.  [ ] Enforce API Gateway Authorizers for RBAC.

### Phase 4: Frontend Modernization
1.  [ ] Migrate to AWS Amplify Hosting.
2.  [ ] Implement real-time progress charts using Kinesis streams.

---
**Status**: Starting Phase 1. Database environment setup in progress.
