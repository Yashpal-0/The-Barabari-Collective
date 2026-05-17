**Pre-work tasks**

---

## **Technical Assessment: EdTech Scalability & AI Integration**

**Role:** Senior Dev **Time Line \- 4 days**

### **The Challenge**

## **Background**

Our flagship tool, **Samvaad Saathi**, is an AI-powered mock interview platform tailored for students in underserved communities and government colleges in India. Because our users often face low-bandwidth internet and use entry-level smartphones, our backend must be exceptionally resilient, cost-effective, and modular.

Our AI Interview tool, **Samvaad Saathi**, currently handles voice-to-voice mock interviews. As we scale to thousands of students from underserved communities (often on low-bandwidth internet), we face three main challenges:

1. **Latency:** High delay between a user finishing an answer and the AI asking a follow-up.  
2. **Cost & Scalability:** Running LLMs and Speech-to-Text for thousands of concurrent users.  
3. **Extensibility:** Building a "Plugin" architecture so the Program Team can add new roles/rules without dev intervention.

---

## **1\. The Task: Mock Evaluation Pipeline**

You are required to build a **Proof of Concept (PoC)** for a background service that processes a student’s answer, evaluates it using a simulated AI, and triggers "Remediation" (practice modules) based on the results.

### **Part A: The Implementation**

Build a service that includes the following logic:

1. **Ingestion:** Create an endpoint/function that accepts the following JSON payload:  
   JSON

```
{
  "interview_id": "int-9901",
  "user_id": "user-445",
  "role_config": {
      "role": "Customer Success",
      "thresholds": { "pacing": 6, "knowledge": 5 } 
  },
  "transcript": "I, uh, think that... customer satisfaction is, you know, the most important thing because it building trust.",
  "audio_metadata": { "duration_seconds": 12, "filler_word_count": 3 }
}
```

2. **Mock AI Grading:** Simulate a call to an LLM. **Do not use a real API key.** Create a mock function that:  
   * Introduces a **2-second artificial delay** (simulating network latency).  
   * Has a **10% chance of failing/timing out**.  
   * Returns a score (1–10) for *Knowledge*, *Pacing*, and *Filler Word Usage*.  
3. **Remediation Logic:** If any score falls below the `role_config` thresholds, the system must "flag" specific practice modules (e.g., *Pacing Practice*, *Structure Practice*).  
4. **Resilience:** Implement a **Error Wrapper/Circuit Breaker**. If the AI mock fails or times out, the system should not crash; it should return a "Pending" status or a graceful fallback so the user experience isn't interrupted.

### **Part B: System Design & Architecture**

In a `DESIGN.md` file, provide a high-level technical blueprint (diagrams are encouraged) for the following three architectural challenges:

#### **1\. The Orchestration Layer: Conversation State & Resilience**

Design the "Interview Engine" to maintain the state of a live, voice-based conversation.

* **The "Drop-off" Problem:** Our target demographic often faces unstable internet. If a user’s connection drops mid-answer, how does your architecture ensure they can resume exactly where they left off without losing their previous transcriptions or scores?  
* **State Management:** Would you manage this state on the client-side, server-side (Redis/Database), or a hybrid? Justify your choice based on reliability.

  #### **2\. The Admin Dashboard Logic: Versioning & Decoupling**

Design a schema and workflow for an Admin Portal that allows non-tech program teams to "generate, vet, and publish" new roles (e.g., adding a "Retail Associate" role with its own JD and base questions).

* **Safe Publishing:** How do you ensure that when an Admin clicks "Publish" on a new version of an interview role, it doesn't break or change the experience for a student who is *currently* in the middle of an interview for that same role?  
* **Verification Flow:** How would you structure the "Vet → Edit → Verify" pipeline in the database?

  #### **3\. Optimized Resource Management: Scaling Voice & AI**

We use specialized Indian-accented voice models for the interviewers. During a placement drive, we expect bursts of up to **5,000 concurrent students**.

* **Caching & Queuing:** How would you implement a caching or queuing strategy to handle the heavy load of Speech-to-Text (STT) and Text-to-Speech (TTS) requests?  
* **Latency vs. Accuracy:** Given that our users are on government college networks, how would you optimize the delivery of voice data to prevent "laggy" AI responses?

---

## **3\. Submission Requirements**

1. **Codebase:** Clean, modular code (GitHub link or Zip).  
2. **README.md:** Instructions on how to run the service and a brief explanation of your tech stack choice.  
3. **DESIGN.md:** Your responses to the Part B architecture questions.

---

### **Pro-Tip for the Candidate:**

*We value pragmatism. You don't need to build a frontend. We are interested in how you structure the "brain" of the application to be scalable and developer-independent.*

---

# **Task 2: Scalable Code Execution System**

## **Technical Assessment: Code Guru Editor Stability & Scale**

---

**Overview of Code Guru:**

## **Overview**

A full-stack Learning Management System (monorepo) with three user roles Admin, Facilitator, Student supporting live coding workspaces, AI-assisted learning, real-time terminal emulation, and automated assignment evaluation.

## **Tech Stack**

| Layer | Technology |
| :---- | :---- |
| Backend runtime | Node.js \+ Express 5 |
| Database | PostgreSQL (Neon cloud) via pg pool |
| Real-time | Socket.io |
| File storage | AWS S3 |
| Containers | Docker (workspace isolation) |
| AI | OpenAI GPT-4o-mini |
| Auth | JWT \+ Google OAuth2 |
| Frontend | React 19 \+ TypeScript |
| Bundler | Vite 7 |
| Styling | Tailwind CSS v4 \+ Radix UI |
| State | Redux Toolkit \+ React Query |
| Code editor | Monaco Editor \+ xterm.js |
| Browser runtime | WebContainers API |
| CI/CD | GitHub Actions → EC2 \+ S3/CloudFront |

---

## **The Challenge**

### **Background**

Our platform, Code Guru, provides an in-browser coding environment where students practice JavaScript and Python through hands-on exercises, assignments, and live sessions.

During internal testing, we observed critical issues:

* The system becomes unstable when multiple users run code simultaneously (\~10–15 users)  
* Execution requests are not properly isolated  
* Failures in one execution can impact others  
* Users experience delays and inconsistent feedback

As we prepare to scale to **1,000 concurrent users**, we need a **robust, fault-tolerant, and scalable code execution system** that works reliably even under constrained environments (low-end devices, unstable internet).

---

## **Your Task**

Design **and implement**  a **Code Execution Engine** that powers the Code Guru editor.

Your solution should demonstrate how the system:

* Safely executes user-submitted code  
* Handles multiple concurrent execution requests  
* Remains stable under load  
* Provides real-time feedback to users  
* Recovers gracefully from failures

---

# **Part A: Implementation**

### **1\. Code Execution API**

Create an endpoint:

```
POST /execute
```

**Request Payload:**

```
{
 "user_id": "user-123",
 "language": "javascript",
 "code": "console.log('Hello World')"
}
```

---

### **2\. Execution Engine Requirements**

#### **a. Code Isolation** 

User-submitted code must be executed in an **isolated environment**.

The system must ensure:

* No execution can affect another  
* No access to host system resources beyond limits

---

#### **b. Concurrency Handling**

The system must support **multiple simultaneous execution requests**.

Implement a **job queue mechanism**

---

#### **c. Execution Timeout**

* Each execution must have a **maximum time limit (e.g., 5 seconds)**  
* Long-running or infinite loops must be terminated safely

---

#### **d. Multi-language Support**

Support execution for at least:

* JavaScript (Node.js)  
* Python

---

#### **e. Execution Result**

Return a structured response:

```
{
 "status": "success | error | timeout",
 "output": "Hello World",
 "execution_time_ms": 120
}
```

---

### **3\. Real-time Execution Updates**

Provide real-time status updates using WebSockets (e.g., Socket.io):

Execution lifecycle:

```
queued → running → completed / failed
```

Clients should be able to track the status of their execution request.

---

### **4\. Failure Isolation**

The system must ensure:

* A failure in one execution does **not impact others**  
* Crashes, errors, or timeouts are handled gracefully

---

# **Part B: System Design & Architecture**

In a `DESIGN.md` file, provide a high-level technical blueprint covering the following:

---

### **1\. System Architecture**

* Key components (API layer, queue, workers, execution environment)  
* Data flow from request → execution → response

---

### **2\. Execution Strategy**

* How code is executed and isolated  
* Approach for supporting multiple languages  
* Tradeoffs between isolation methods (e.g., Docker vs process-based)

---

### **3\. Scalability Approach**

* How the system handles increasing concurrent users  
* Strategy for scaling workers horizontally  
* Behavior under sudden traffic spikes

---

### **4\. Failure Handling**

* Handling execution failures, timeouts, and worker crashes  
* Retry strategies (if any)  
* Ensuring system stability under partial failures

---

### **5\. State & Persistence**

* How execution state is tracked (queued, running, completed)  
* Handling user disconnections  
* Whether state is stored in-memory, Redis, or database

---

### **6\. Low-bandwidth Optimization**

Given our users often operate on unstable networks:

* How would you optimize response delivery?  
* Would you batch responses or stream logs?  
* How do you minimize payload size?

---

### **7\. Operational Considerations**

* Logging and monitoring strategy  
* Debugging failed executions  
* Deployment approach (local, cloud, containers, etc.)

---

### **8\. Tradeoffs**

Explain key design decisions and their implications:

* Performance vs cost  
* Latency vs isolation  
* Simplicity vs scalability

---

# **Submission Requirements**

### **1\. Codebase**

* Clean, modular, and well-structured code  
* GitHub repository or ZIP file

---

### **2\. README.md**

Include:

* Setup and run instructions  
* Tech stack used  
* Brief explanation of your approach

---

### **3\. DESIGN.md**

* Detailed responses to Part B  
* Diagrams (architecture \+ execution flow)

---

# **Task 3: Jira-Task Management System**

## **Objective**

Build a lightweight Jira-like task management system focused on clean architecture, scalability, and maintainability.

The assignment is designed to simulate a real-world collaborative engineering workflow involving frontend systems, backend APIs, database design, and system design thinking.

---

# **Problem Statement**

Build a simplified Kanban-based ticket management platform where teams can manage tasks and nested tickets.

The system should allow users to:

* Create tickets/tasks  
* Organize tasks in Kanban columns  
* Create parent-child relationships between tickets  
* Add metadata to tickets  
* Comment on tickets  
* Move tickets across stages

Think of this as a lightweight internal engineering/project management tool.

---

# **Core Features**

## **1\. Kanban Board**

Create a Kanban board with default columns:

* Backlog  
* Todo  
* In Progress  
* Review  
* Done

Users should be able to:

* Create tickets  
* Drag and drop tickets between columns  
* Persist state changes

---

## **2\. Ticket System**

Each ticket should support:

### **Required Fields**

* Title  
* Description  
* Status  
* Priority  
* Assignee  
* Team tag  
* Parent ticket (optional)  
* Created timestamp

### **Nested Ticketing**

Tickets should support parent-child hierarchy.

Example:

* Parent Ticket: “Authentication Module”  
  * Child Ticket: “Login API”  
  * Child Ticket: “Signup Flow”

---

## **3\. Comments System**

Users should be able to:

* Add comments on tickets  
* View ticket discussion history

---

## **4\. Search & Filtering**

Implement basic filtering:

* By status  
* By priority  
* By team  
* By assignee

---

# **HLD (High Level Design)**

Include a simple High Level Design document covering:

## **Phase 1 – Initial System Design**

Explain:

* Overall architecture  
* Database schema design  
* API flow  
* Frontend structure

---

## **Phase 2 – Scaling Discussion**

Update your design assuming:

* 100K+ tickets  
* Thousands of concurrent users  
* Multiple teams using the platform simultaneously

Discuss:

* Database scaling strategies  
* Caching  
* Realtime updates  
* Queue/event systems  
* API performance optimizations  
* Rate limiting  
* Horizontal scaling  
* Concurrency handling

---

# **Deliverables**

Please submit:

1. GitHub repository  
2. README with setup instructions  
3. HLD document

