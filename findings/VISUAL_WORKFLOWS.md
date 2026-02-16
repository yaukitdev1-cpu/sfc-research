# SFC-Fetch Visual Workflow

## High-Level System Flow

```mermaid
flowchart TB
    subgraph Input["Input"]
        A[Start sfc-fetch]
    end
    
    subgraph Decision["Decision Point"]
        B{Initial Download or Daily Check?}
    end
    
    subgraph FullDownload["Full Download"]
        C[Loop years 2000-2026]
        D[Search API: List circulars]
        E[Download Content]
    end
    
    subgraph DailyCheck["Daily Check"]
        F[Check current year only]
        G[Compare with index]
        H[Detect new/modified]
    end
    
    subgraph Processing["Content Processing"]
        I{Year >= 2012?}
        J[Download HTML]
        K[Convert to Markdown]
        L[Download PDF]
        M[Store PDF only]
    end
    
    subgraph Storage["Storage"]
        N[(PDF Files)]
        O[(HTML Files)]
        P[(Markdown Files)]
        Q[(index.json)]
    end
    
    subgraph Output["Output"]
        R[Complete!]
    end
    
    A --> B
    B -->|Full Download| C
    B -->|Daily Check| F
    
    C --> D
    D --> E
    
    F --> G
    G --> H
    H --> E
    
    E --> I
    I -->|Yes| J
    I -->|No| L
    
    J --> K
    J --> L
    K --> O
    K --> P
    
    L --> M
    M --> N
    
    O --> Q
    P --> Q
    N --> Q
    
    Q --> R
```

## Circular Processing Detail

```mermaid
flowchart LR
    subgraph Discovery["Discovery Phase"]
        A[refNo from search]
    end
    
    subgraph TypeCheck{"Circular Type"}
        B{Check Year}
    end
    
    subgraph Modern["Modern (2012+)"]
        C[Get HTML]
        D[Save HTML]
        E[Convert MD]
        F[Save MD]
    end
    
    subgraph Legacy["Legacy (2000-2011)"]
        G[Skip HTML]
        H[Metadata only]
    end
    
    subgraph Common["Common Steps"]
        I[Get PDF]
        J[Save PDF]
        K{Has Appendix?}
        L[Download Appendix]
        M[Save Appendix]
        N[Update Index]
    end
    
    A --> B
    B -->|>= 2012| C
    B -->|< 2012| G
    
    C --> D
    D --> E
    E --> F
    G --> H
    
    D --> I
    F --> I
    H --> I
    
    I --> J
    J --> K
    K -->|Yes| L
    K -->|No| N
    L --> M
    M --> N
```

## Data Format Transformation

```mermaid
flowchart LR
    subgraph API["API Response"]
        A[HTML String]
        B[PDF Binary]
    end
    
    subgraph Processing["Processing"]
        C[Parse HTML]
        D[Extract Sections]
        E[Convert to Markdown]
    end
    
    subgraph Storage["File Storage"]
        F["📄 26EC6_raw.html"]
        G["📝 26EC6.md"]
        H["📑 26EC6.pdf"]
    end
    
    subgraph Usage["Usage"]
        I[Search/Index]
        J[Read Content]
        K[Archive]
    end
    
    A --> C
    C --> D
    D --> E
    
    A --> F
    E --> G
    B --> H
    
    F --> I
    G --> J
    H --> K
```

## Daily Check Sequence

```mermaid
sequenceDiagram
    participant Cron as Scheduler
    participant App as sfc-fetch
    participant API as SFC API
    participant Index as index.json
    participant Notify as Notification

    Note over Cron,Notify: Daily at 09:00
    
    Cron->>App: Trigger daily check
    App->>Index: Load existing index
    Index-->>App: Current state
    
    App->>API: Search current year
    API-->>App: Recent circulars
    
    loop For each circular
        App->>App: Check if exists in index
        alt New circular
            App->>API: Download full content
            API-->>App: Content data
            App->>App: Process & save
            App->>Index: Add entry
            App->>Notify: Send "NEW" notification
        else Modified
            App->>API: Re-download content
            API-->>App: Updated content
            App->>App: Re-process & save
            App->>Index: Update entry
            App->>Notify: Send "UPDATED" notification
        end
    end
    
    App->>Index: Save updated index
    App->>Cron: Report completion
```

## Year-by-Year Coverage

```mermaid
flowchart TB
    subgraph Years2000["2000-2011 (Legacy)"]
        A1["H035, H046, ..."]
        A2["~200 circulars"]
        A3["PDF only"]
        A4["Rare appendix"]
    end
    
    subgraph Years2012["2012-2025 (Modern)"]
        B1["12EC16, 26EC6, ..."]
        B2["~500 circulars"]
        B3["HTML + PDF"]
        B4["Common appendix"]
    end
    
    subgraph Total["Total Coverage"]
        C1["~700 circulars"]
        C2["25 years of data"]
        C3["All accessible via API"]
    end
    
    A2 --> C1
    B2 --> C1
    A4 --> C2
    B4 --> C2
    C1 --> C3
```

## Error Handling Flow

```mermaid
flowchart TD
    A[API Call] --> B{Success?}
    
    B -->|Yes| C[Process Response]
    C --> D[Continue]
    
    B -->|No| E{Error Type}
    
    E -->|Network| F[Wait 2^attempt seconds]
    F --> G{Retry < 3?}
    G -->|Yes| A
    G -->|No| H[Log error]
    
    E -->|Rate Limit| I[Wait 60 seconds]
    I --> A
    
    E -->|Not Found| J[Skip circular]
    J --> K[Mark as unavailable]
    
    E -->|Server Error| L[Wait 5 minutes]
    L --> A
    
    H --> M[Continue with next]
    K --> M
    D --> M
```

---

*Visual diagrams for sfc-fetch implementation guide*
