
Question from LLM and answers:
- What is the primary goal for phase 1: historical query API, reliability hardening, or analytics/reporting?
  * Analytics/reporting - By that I mean  analyzing data from ingestions and present messages to API endpoints as well as web socket messages.
  
- For historical queries, what filters are required first (mcuId, sensorId, sensorType, time range), and do you want pagination from day one?
  * Readings data can be selected by one or more of:  mcuId, sensorId, time range
  * Status data: only mcuId is relevant for queries to database, and  for storing only changes in ip-address field or absense of data in time series need to be stored.
  
- What are your retention rules (raw forever vs TTL/downsampling), and any volume target we should design for?
  * A. Detailed readings data stored for 24 hours
  * B. Downsize older data and keep for a year or so (?). To be selected in view of space reserved / cost.
   
- Should we add ingestion guarantees now (idempotency/dedup, retry policy, dead-letter handling), or keep best-effort writes?
  * I'm not sure yet and not sure about the terms you use, but drop it for the moment.
  
- Do you want API auth in this phase (none, API key, JWT), or keep internal-only endpoints?
  * Wait with this.
  
- Which observability is mandatory now: structured logs only, or also metrics/tracing and alertable health checks?
  * Wait with this also.
  
- Should “latest in-memory state” remain the API source, or should some endpoints read directly from Postgres?
  * When latest in-memory data can't provide what is requested by an API, it would be fine to complete the search from database, or eventually take it all from the database.
    
- Testing priority: more unit tests, or integration tests with real MQTT + Postgres in CI?
  * Unit tests may still be useful, but primarily integration tests should be important .  Of that reason I feel for having a test server running to provide enough relevant data.  So, in fact that will have higher priority before we start with rest of these other anwers. See next point:
  
- Deployment target for this phase (local only, Docker, VM, cloud service)?
  * At least during development I stick to hosting on a local server.
    I have a dedicated "server" running Linux Mint desktop with Docker. It already contains a Mosquitto MQTT broker and A Postgres/Timescale database. These have been used till now, but to create better data for testing I want to deploy also the EnvNode (from this VSCode project/workspace) to that Docker installation.
    I have not done that before, so fine if you can assist.
    After you have fixed the issue in the the following question, this deployment will have first priority for me.

- Flow.md appears to contain duplicated/partially merged sections; do you want me to clean that file first as part of kickoff?
  * Yes, fine if you do that first.