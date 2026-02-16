# SFC-Fetch Workflows - Mermaid Diagrams

## 1. System Architecture Overview

```mermaid
flowchart TB
    subgraph API["SFC API Layer"]
        A1["/api/circular/search"]
        A2["/api/circular/content"]
        A3["/api/circular/openFile"]
        A4["/api/circular/openAppendix"]
    end
    
    subgraph Fetch["sfc-fetch"]
        F1[Search Module]
        F2[Download Module]
        F3[Processing Module]
        F4[Index Manager]
    end
    
    subgraph Storage["Local Storage"]
        S1[(PDF Files)]
        S2[(HTML Files)]
        S3[(Markdown Files)]
        S4[(Appendix PDFs)]
        S5[(index.json)]
    end
    
    A1 --> F1
    A2 --> F2
    A3 --> F2
    A4 --> F2
    
    F1 --> F4
    F2 --> F3
    F3 --> S2
    F3 --> S3
    F2 --> S1
    F2 --> S4
    F4 --> S5
```

## 2. Full Download Workflow

```mermaid
flowchart TD
    Start([Start Full Download]) --> Init[Initialize: years=2000-2026]
    
    Init --> LoopYear{For each year}
    
    LoopYear --> Search[POST /api/circular/search<br/>year, pageNo, pageSize=50]
    
    Search --> HasMore{More pages?}
    
    HasMore -->|Yes| NextPage[pageNo++] --> Search
    HasMore -->|No| ProcessYear[Process year circulars]
    
    ProcessYear --> LoopCircular{For each circular}
    
    LoopCircular --> CheckYear{Year >= 2012?}
    
    CheckYear -->|Yes| GetContent[GET /api/circular/content<br/>Get HTML]
    CheckYear -->|No| SkipHtml[Skip HTML<br/>PDF only]
    
    GetContent --> SaveHtml[Save raw HTML]
    SaveHtml --> ConvertMd[Convert to Markdown]
    ConvertMd --> SaveMd[Save .md file]
    
    SkipHtml --> GetPdf[GET /api/circular/openFile<br/>Download PDF]
    SaveHtml --> GetPdf
    
    GetPdf --> SavePdf[Save PDF file]
    
    SavePdf --> CheckAppendix{Has appendix?}
    
    CheckAppendix -->|Yes| LoopAppendix{For each appendix}
    CheckAppendix -->|No| NextCircular
    
    LoopAppendix --> GetAppendix[GET /api/circular/openAppendix<br/>Download PDF]
    GetAppendix --> SaveAppendix[Save appendix PDF]
    SaveAppendix --> MoreAppendix{More?}
    MoreAppendix -->|Yes| LoopAppendix
    MoreAppendix -->|No| NextCircular
    
    NextCircular --> LoopCircular
    LoopCircular -->|Done| BuildIndex[Build master index.json]
    
    BuildIndex --> SaveIndex[Save index]
    BuildIndex --> UpdateProgress[Update progress tracking]
    
    UpdateProgress --> NextYear{More years?}
    NextYear -->|Yes| LoopYear
    NextYear -->|No| Complete([Download Complete])
    
    Complete --> Summary[Generate summary report]
```

## 3. Daily Update Check Workflow

```mermaid
flowchart TD
    Start([Start Daily Check]) --> LoadIndex[Load index.json]
    LoadIndex --> LoadLastCheck[Load last-check.json]
    
    LoadLastCheck --> GetCurrentYear[Get current year]
    GetCurrentYear --> Search[POST /api/circular/search<br/>Current year, page 0]
    
    Search --> Compare{Compare with index}
    
    Compare --> NewCirculars{New circulars?}
    Compare --> Modified{Modified?}
    
    NewCirculars -->|Yes| ProcessNew[For each new circular]
    NewCirculars -->|No| CheckModified
    
    ProcessNew --> LogNew[Log: "NEW: {refNo}"]
    LogNew --> DownloadNew[Download full content]
    DownloadNew --> AddToIndex[Add to index]
    AddToIndex --> NotifyNew[Notify user]
    NotifyNew --> MoreNew{More new?}
    MoreNew -->|Yes| ProcessNew
    MoreNew -->|No| CheckModified
    
    CheckModified --> Modified
    Modified -->|Yes| ProcessMod[For each modified]
    Modified -->|No| UpdateTimestamp
    
    ProcessMod --> LogMod[Log: "MODIFIED: {refNo}"]
    LogMod --> ReDownload[Re-download content]
    ReDownload --> UpdateIndex[Update index entry]
    UpdateIndex --> NotifyMod[Notify user]
    NotifyMod --> MoreMod{More modified?}
    MoreMod -->|Yes| ProcessMod
    MoreMod -->|No| UpdateTimestamp
    
    UpdateTimestamp --> SaveCheck[Save last-check.json]
    SaveCheck --> GenerateReport[Generate check report]
    GenerateReport --> Complete([Check Complete])
    
    Complete --> Summary{Any updates?}
    Summary -->|Yes| SendNotification[Send notification]
    Summary -->|No| LogNoUpdates[Log: "No updates"]
    SendNotification --> End([End])
    LogNoUpdates --> End
```

## 4. Single Circular Data Flow

```mermaid
sequenceDiagram
    participant Client as sfc-fetch
    participant Search as /api/circular/search
    participant Content as /api/circular/content
    participant OpenFile as /api/circular/openFile
    participant OpenAppendix as /api/circular/openAppendix
    participant Storage as Local Storage

    Note over Client,Storage: Processing Circular 26EC6 (2026)

    Client->>Search: POST {year: 2026, pageNo: 0}
    Search-->>Client: {items: [{refNo: "26EC6", ...}]}

    alt Year >= 2012
        Client->>Content: GET ?refNo=26EC6&lang=EN
        Content-->>Client: {html: "<ol>...</ol>", ...}
        Client->>Storage: Save raw HTML
        Client->>Client: Convert HTML → Markdown
        Client->>Storage: Save Markdown
    end

    Client->>OpenFile: GET ?refNo=26EC6&lang=EN
    OpenFile-->>Client: [PDF binary data]
    Client->>Storage: Save PDF

    alt Has Appendix
        loop For each appendix
            Client->>OpenAppendix: GET ?refNo=26EC6&appendix=N&lang=EN
            OpenAppendix-->>Client: [PDF binary data]
            Client->>Storage: Save Appendix PDF
        end
    end

    Client->>Storage: Update index.json

    Note over Client,Storage: Circular 26EC6 Complete
```

## 5. Storage Index Structure

```mermaid
erDiagram
    INDEX ||--o{ CIRCULAR : contains
    INDEX {
        string generatedAt
        int totalCount
        json byYear
        json byType
    }
    
    CIRCULAR ||--o{ FILE : has_files
    CIRCULAR {
        string refNo PK
        string title
        date releasedDate
        int year
        string lang
        int postDocType
        string deptCode
        boolean hasHtml
        boolean hasAppendix
        int appendixCount
        date lastFetched
    }
    
    FILE {
        string type
        string path
        int size
        string checksum
    }
```

---

*Generated for sfc-fetch implementation*
