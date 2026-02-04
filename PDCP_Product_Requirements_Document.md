# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Post-Dispatch Consolidation Platform (PDCP)

**Product Type:** B2B SaaS for last-mile logistics operations  
**Target Market:** India-first (Tier-1 and Tier-2 urban logistics)  
**Document Version:** 1.0  
**Date:** February 2026

---

## 1. EXECUTIVE SUMMARY

The Post-Dispatch Consolidation Platform (PDCP) is a post-dispatch operations SaaS that reduces last-mile cost and carbon emissions by conservatively absorbing late demand into vehicles already on the road. The platform includes a blockchain-backed trust layer that provides tamper-proof parcel custody while preserving carrier autonomy, customer ownership, and service guarantees in the Indian logistics ecosystem.

### Key Value Proposition
- **Primary Goal:** Eliminate unnecessary vehicle dispatches through intelligent post-dispatch consolidation
- **Core Principle:** The No-New-Vehicle Rule - only assign parcels to existing vehicles under strict safety constraints
- **Trust Layer:** Blockchain-backed parcel custody for verifiable accountability between business partners

---
---

## 2. PROBLEM STATEMENT

### Context
Last-mile delivery is the most expensive and carbon-intensive segment of logistics in India. Despite advances in routing and fleet management systems, a large portion of inefficiency occurs after vehicles are already dispatched, where current software offers minimal decision support.

### Observed Reality in Indian Operations
- Vehicles are dispatched partially full
- Multiple carriers send vehicles into the same delivery zones
- Late or overflow parcels trigger emergency dispatches
- Dispatchers rely on phone calls, WhatsApp groups, and manual judgment
- Existing tools focus on pre-dispatch planning and routing

### Business Impact
- **Increased empty miles** leading to higher operational costs
- **Higher fuel consumption** and carbon emissions per parcel
- **More vehicles on the road** contributing to urban congestion
- **Reduced profitability** due to inefficient resource utilization
- **Trust issues** between carriers and delivery partners

### Hard Constraints (Non-Negotiable)
Any solution must:
- Preserve carrier autonomy
- Preserve customer ownership
- Avoid pricing or revenue interference
- Maintain SLA guarantees
- Respect competitive boundaries
- Work with human decision-making on the ground

---

## 3. CORE INSIGHT & PRINCIPLES

### Core Insight
The largest avoidable source of last-mile emissions is unnecessary vehicle dispatch, not inefficient driving. If late or overflow parcels can be absorbed into vehicles already on the road—under safe and conservative constraints—dispatches can be avoided without rerouting entire routes or forcing cooperation.

### The No-New-Vehicle Rule
A parcel may be assigned to an existing vehicle only if ALL conditions are met:
1. Vehicle has spare capacity
2. Additional distance and time stay within configured thresholds
3. Delivery SLA remains safe

**If any condition fails:**
- The parcel is rejected
- Normal dispatch proceeds
- Service reliability is never compromised

This ensures conservative system behavior, trustworthiness, operational safety, and real-world adoption in Indian logistics environments.

---

## 4. PRODUCT DEFINITION

### What PDCP IS
- A post-dispatch decision layer
- An operations control SaaS
- A human-in-the-loop system
- A carbon reduction tool via waste elimination
- A trust verification platform using blockchain technology

### What PDCP IS NOT
- A route optimization engine
- A driver marketplace
- A crowdsourced delivery platform
- A customer-facing app
- A pricing or settlement system
- A centralized warehouse

---

## 5. USER PERSONAS

### 5.1 Dispatcher / Operations Manager (Desktop Web)
**Primary User - Decision Maker**

**Goals:**
- Avoid emergency dispatches
- Reduce last-minute chaos
- Trust system recommendations
- Maintain SLA discipline
- Verify parcel custody and accountability

**Pain Points:**
- Late parcel arrivals
- Underutilized vehicles
- Manual coordination
- No post-dispatch visibility
- Trust issues with external delivery partners

**Key Workflows:**
- Monitor live operations map
- Review consolidation recommendations
- Override decisions when necessary
- Track impact metrics
- Verify blockchain custody records

### 5.2 Delivery Driver (Mobile App)
**Secondary User - Execution**

**Goals:**
- Predictable routes
- Clear instructions
- Minimal surprises
- Fast escalation
- Proof of legitimate parcel custody

**Pain Points:**
- Sudden route changes
- Conflicting instructions
- Poor communication
- Unclear parcel ownership

**Key Workflows:**
- View route summary
- Accept/reject new stops
- Confirm deliveries
- Escalate issues
- Provide proof of delivery

**Note:** Drivers do not make optimization decisions - they execute approved consolidations.

---

## 6. VEHICLE-TYPE AWARE DESIGN

### Two-Wheelers (2W)
- **Tight SLA tolerance** - minimal time buffer
- **Low carrying capacity** - limited consolidation potential
- **Minimal deviation allowed** - strict route adherence
- **Usage:** Selective and conservative application

### Four-Wheelers (4W)
- **Higher spare capacity** - greater consolidation potential
- **Corridor-based routes** - more flexible routing
- **Larger consolidation potential** - primary optimization target
- **Usage:** Primary pilot and scale target

PDCP applies different thresholds, scoring weights, and eligibility rules per vehicle type to ensure safe and practical operations.

---

## 7. CORE FEATURES

### 7.1 Post-Dispatch Decision Engine
**Purpose:** Evaluates late or overflow parcels against vehicles already on the road

**Inputs:**
- Vehicle GPS location
- Remaining capacity
- Planned route corridor
- SLA deadlines
- Parcel size and destination
- Vehicle type

**Outputs:**
- ACCEPT / REJECT decision
- Assigned vehicle (if accepted)
- Human-readable explanation

### 7.2 Decision Scoring + Hard Constraints
**Weighted Scoring Factors:**
- Capacity availability
- Deviation distance
- Time buffer
- Vehicle type suitability

**Hard Constraints (Cannot be overridden by scoring):**
- Capacity limits
- SLA safety margins
- Vehicle type restrictions

### 7.3 Reject-With-Reason Discipline
- Explicit rejection with detailed explanation
- Prevents silent failures
- Builds operator trust through transparency

### 7.4 Manual Override (Human Control)
- Dispatcher can override any system decision
- Reason mandatory for all overrides
- All overrides logged for audit purposes

### 7.5 Audit Log & Explainability
**Records:**
- All inputs and decisions
- Override actions and reasons
- Timestamps and actors
- System state snapshots

**Used for:**
- Operations reviews
- Dispute resolution
- SLA audits
- Performance optimization

### 7.6 Counterfactual Impact Engine
**Displays:**
- Vehicles dispatched vs avoided
- Distance saved (km)
- Fuel saved (estimated liters)
- Emissions reduced (CO2 equivalent)
- Cost savings

### 7.7 Shadow Mode
- System runs without enforcing decisions
- Recommendations logged only
- Mandatory for pilot and onboarding phases
- Allows validation without operational risk

---

## 8. TRUST & BLOCKCHAIN LAYER

### 8.1 Purpose
Build verifiable trust between business vendors, carriers, and delivery partners when parcels are executed by entities outside the original dispatch fleet.

**Addresses:**
- Fear of parcel loss or tampering
- Lack of neutral proof of custody
- Dispute ambiguity
- Low trust in unknown delivery partners

### 8.2 Design Principles
The blockchain layer acts as a **Parcel Custody Ledger**, not an operational system.

**Provides:**
- End-to-end parcel traceability
- Tamper-proof custody records
- Neutral, shared source of truth
- Evidence-based partner reputation

**Does NOT:**
- Optimize routes
- Control dispatch logic
- Handle pricing or payments
- Replace PDCP's decision engine

### 8.3 Blockchain-Tracked Events (Immutable)
For each parcel, these events are recorded (hashed, privacy-safe):
1. **Parcel Created** (origin timestamp)
2. **Parcel Dispatched** (carrier + vehicle reference)
3. **Custody Transfer** (post-dispatch consolidation)
4. **Out-for-Delivery** confirmation
5. **Delivered** (proof-of-delivery hash)
6. **Exception Events** (delay, escalation, damage)

**Privacy:** No customer PII is stored on-chain.

### 8.4 Ownership & Accountability Model
- **Original carrier retains parcel ownership**
- **SLA responsibility remains unchanged**
- **Executing vehicle delivers on behalf of the owner**
- **Blockchain provides neutral custody evidence**

### 8.5 Delivery Partner Trust Score
PDCP derives an off-chain Trust Score using:
- Blockchain-verified delivery success
- SLA adherence
- Exception frequency
- Dispute outcomes

**Characteristics:**
- System-derived (not crowd-sourced)
- Evidence-based
- Non-manipulable

### 8.6 Incentives (Non-Financial)
**Higher-trust partners receive:**
- Priority eligibility for consolidation
- Faster dispatcher approvals
- Access to higher-value parcels

**Lower-trust partners face:**
- Volume caps
- Mandatory shadow mode
- Additional approvals

**Note:** No tokens, credits, or settlements are introduced.

### 8.7 Blockchain Technology Choice
- **Type:** Permissioned blockchain
- **Recommended:** Hyperledger Fabric / Polygon Edge
- **Nodes operated by:**
  - PDCP (neutral operator)
  - Participating carriers (optional)
  - Auditor / regulator (future optional)

---

## 9. HUMAN-SAFE DESIGN

- Parcel labels remain visible
- Warehouse staff know parcel origins
- Drivers can infer ownership
- PDCP formalizes accountability instead of hiding reality

---

## 10. USER INTERFACES

### 10.1 Dispatcher Desktop Web App
**Design Philosophy:** Quiet • Explainable • Exception-first

**Core Screens:**
1. **Live Operations Map**
   - Active vehicles with spare capacity indicators
   - Route corridors (polylines)
   - Hub locations
   - Real-time parcel flow

2. **Parcel Event Feed**
   - Late arrivals
   - Consolidation opportunities
   - Decision recommendations
   - Exception alerts

3. **Decision Explanation Panel**
   - Scoring breakdown
   - Constraint evaluation
   - Impact preview
   - Accept/Reject/Override actions

4. **Exception & Override Management**
   - Manual override interface
   - Reason capture
   - Escalation workflows

5. **Impact & Trust Summary Dashboard**
   - Dispatches avoided
   - Fuel/emissions saved
   - Partner trust scores
   - Blockchain verification status

### 10.2 Driver Mobile App
**Design Philosophy:** Inform • Reassure • Don't burden

**Core Features:**
- **Route Summary** (read-only view)
- **New Stop Notification** with impact preview
- **Impact Preview** (+km / +min estimates)
- **Accept / Escalate** simple binary choice
- **One-tap Dispatcher Call** for immediate support
- **Offline Tolerance** for poor network areas
- **Delivery Confirmation** with POD capture

---

## 11. TECHNICAL ARCHITECTURE

### 11.1 System Overview
PDCP is a distributed, event-driven system consisting of:
- Dispatcher Web Application (Warehouse/Desktop)
- Driver Mobile Application
- Core Backend (Decision Engine + Orchestration)
- Blockchain Trust Layer (Parcel Custody Ledger)
- Real-time Communication Layer
- External Services (Google Maps APIs, Notifications)

### 11.2 High-Level Architecture
```
Dispatcher Web App  ───────┐
Driver Mobile App ────────┼──► Backend API (NestJS)
External Systems ─────────┘
                           │
                           ├── Decision Engine
                           ├── Audit & Policy Engine
                           ├── Trust Score Engine
                           ├── Blockchain Adapter
                           │
                           ├── PostgreSQL
                           ├── Redis
                           └── WebSocket Gateway
```

### 11.3 Technology Stack

**Frontend:**
- **Web:** React.js + TypeScript + Vite/Next.js
- **Mobile:** React Native (Android-first, offline-first)

**Backend:**
- **API:** Node.js + NestJS + TypeScript
- **Database:** PostgreSQL (primary), Redis (cache)
- **Blockchain:** Hyperledger Fabric (recommended)

**External Services:**
- **Maps:** Google Maps Platform (JavaScript API, Distance Matrix API, Geocoding API)
- **Auth:** Firebase Auth / Auth0
- **Notifications:** Firebase Cloud Messaging + SMS fallback

### 11.4 API Design
**REST APIs** for:
- Parcel creation
- Policy configuration
- Historical queries
- Audit access

**WebSocket APIs** for:
- Parcel arrival events
- Decision updates
- Driver acknowledgements
- Live vehicle state updates

---

## 12. DECISION ENGINE SPECIFICATIONS

### 12.1 Nature
- Stateless service
- Deterministic output
- Idempotent execution

### 12.2 Processing Logic
1. **Filter eligible vehicles** based on location and capacity
2. **Apply hard constraints** (capacity, SLA, vehicle type)
3. **Score remaining candidates** using weighted factors
4. **Select best candidate** (if any meets thresholds)
5. **Generate explanation** for decision
6. **Emit decision event** for audit trail

### 12.3 Caching Strategy
- Distance results cached in Redis
- Vehicle states cached with TTL
- Aggressive caching for Google Maps API calls

---

## 13. DATA STORAGE REQUIREMENTS

### 13.1 PostgreSQL (Primary Store)
**Stores:**
- Parcels and their lifecycle
- Vehicles and capacity data
- Decisions and explanations
- Overrides and reasons
- Policies and configurations
- Audit logs
- Trust score aggregates

**Design Principles:**
- Strong referential integrity
- Append-only logs for audits
- Indexed by time & vehicle ID

### 13.2 Redis (In-Memory Cache)
**Used for:**
- Active vehicle state
- Eligibility pre-checks
- Distance matrix caching
- WebSocket session tracking

### 13.3 Blockchain (Immutable Ledger)
**Stores:**
- Parcel custody events
- Transaction hashes
- Actor references (hashed)
- Timestamps

---

## 14. REAL-TIME COMMUNICATION

**Technology:** WebSockets (Socket.IO or native WS) + Server-Sent Events (fallback)

**Key Events:**
- Parcel arrived
- Decision computed
- Decision overridden
- Driver accepted/escalated
- Delivery completed

---

## 15. TRUST SCORE ENGINE

### 15.1 Nature
- Off-chain computation
- Deterministic rules
- Periodic recomputation

### 15.2 Inputs
- Blockchain-verified events
- Delivery success rate
- SLA adherence
- Exception history

### 15.3 Outputs
- Partner trust score (0-100)
- Eligibility weighting
- Risk assessment

---

## 16. WORKFLOW (END-TO-END)

1. **Parcel Created** → blockchain logged
2. **Vehicle Dispatched** → PDCP tracks passively
3. **Late Parcel Arrives** → triggers evaluation
4. **Decision Engine Evaluates** → eligibility assessment
5. **Dispatcher Approves/Overrides** → human validation
6. **Custody Transfer Logged** → blockchain record
7. **Driver Executes Delivery** → mobile app workflow
8. **POD Logged** → trust score updated
9. **Counterfactual Impact Recorded** → metrics updated

---

## 17. SUCCESS METRICS

### 17.1 Primary Metrics
- **Vehicle dispatches avoided** (absolute number and percentage)
- **Fuel savings** (liters per month)
- **Emissions reduction** (CO2 equivalent)

### 17.2 Secondary Metrics
- **Vehicle utilization improvement** (capacity percentage)
- **SLA adherence** (maintained or improved)
- **Partner trust score distribution**
- **System adoption rate** (shadow mode to active usage)

### 17.3 Operational Metrics
- **Decision latency** (< 2 seconds target)
- **System uptime** (99.9% during ops hours)
- **Override rate** (should decrease over time)

---

## 18. FAILURE HANDLING & RESILIENCE

### 18.1 Failure Scenarios
- **Maps API fails** → use cached estimates
- **Blockchain write fails** → retry + local log
- **WebSocket drops** → auto-reconnect
- **Driver offline** → SMS fallback
- **Decision engine timeout** → default to reject

### 18.2 Graceful Degradation
- System defaults to conservative behavior
- Manual processes remain available
- Audit trail maintained even during failures

---

## 19. SECURITY & COMPLIANCE

### 19.1 Authentication & Authorization
- **Authentication:** Firebase Auth / Auth0 with JWT sessions
- **Authorization:** Role-based access control (Dispatcher, Driver, Admin)

### 19.2 Security Measures
- TLS encryption everywhere
- API rate limiting
- IP whitelisting for warehouses
- Encrypted secrets management

### 19.3 Privacy
- No customer PII on blockchain
- Hashed references for privacy
- GDPR-compliant data handling

---

## 20. DEPLOYMENT & ENVIRONMENTS

### 20.1 Environments
1. **Development** - Feature development and testing
2. **Staging** - Integration testing and QA
3. **Pilot (Shadow Mode)** - Real operations without enforcement
4. **Production** - Full operational deployment

### 20.2 Infrastructure
- Dockerized services
- Kubernetes (optional)
- CI/CD pipeline
- Monitoring (ELK/OpenTelemetry, Prometheus)
- Alerts (PagerDuty/Opsgenie)

---

## 21. MVP SCOPE

### 21.1 Included in MVP
- Decision engine with hard constraints
- Dispatcher dashboard (web)
- Driver mobile app (basic)
- Shadow mode operation
- Audit logs and explainability
- Trust & blockchain layer (event logging)
- Google Maps integration
- Basic impact metrics

### 21.2 Excluded from MVP
- Advanced route optimization
- Machine learning models
- Billing/settlement systems
- Customer-facing applications
- Forced carrier pooling
- Advanced analytics dashboard

---

## 22. RISKS & MITIGATION

### 22.1 Technical Risks
- **Google Maps API costs** → Aggressive caching and rate limiting
- **Blockchain performance** → Permissioned network with optimized consensus
- **Real-time latency** → WebSocket fallbacks and offline tolerance

### 22.2 Business Risks
- **Carrier adoption resistance** → Shadow mode and gradual rollout
- **Trust in automation** → Human override capabilities and explainable decisions
- **SLA violations** → Conservative constraints and manual fallbacks

### 22.3 Operational Risks
- **Driver confusion** → Simple mobile interface and clear communication
- **System downtime** → Manual process fallbacks and high availability design

---

## 23. GO-TO-MARKET STRATEGY

### 23.1 Pilot Approach
1. **Shadow Mode Deployment** - 2-3 months observation
2. **Limited Geographic Pilot** - Single city, 2-3 carriers
3. **Gradual Feature Activation** - Conservative constraint relaxation
4. **Trust Score Validation** - Blockchain custody verification
5. **Scale Preparation** - Multi-city expansion planning

### 23.2 Success Criteria for Pilot
- 10%+ reduction in emergency dispatches
- 95%+ SLA maintenance
- 80%+ dispatcher satisfaction
- Successful blockchain custody verification
- Zero trust-related disputes

---

## 24. HANDOFF CHECKLIST FOR DEVELOPMENT TEAM

### 24.1 Prerequisites
- [ ] PRD approved by stakeholders
- [ ] Google Maps API keys provisioned
- [ ] Blockchain network configured
- [ ] Staging environment ready
- [ ] Shadow mode enabled by default
- [ ] Pilot geography defined

### 24.2 Development Readiness
- [ ] Technical architecture reviewed
- [ ] Database schema designed
- [ ] API specifications documented
- [ ] Blockchain integration plan finalized
- [ ] Security requirements validated
- [ ] Performance benchmarks established

---

## 25. CONCLUSION

The Post-Dispatch Consolidation Platform represents a significant opportunity to reduce waste and emissions in India's last-mile logistics sector while building trust through blockchain-verified custody. By focusing on conservative, human-controlled decision-making and maintaining strict service guarantees, PDCP can achieve meaningful environmental and economic impact while ensuring operational safety and carrier autonomy.

The platform's success depends on careful implementation of the No-New-Vehicle Rule, robust trust mechanisms, and seamless integration with existing logistics workflows. The MVP scope provides a solid foundation for validation and gradual scaling across India's diverse logistics ecosystem.

---

**Document Status:** Ready for Development  
**Next Steps:** Technical design review and development sprint planning  
**Contact:** [Product Team Contact Information]