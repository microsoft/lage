---
name: 'RFC: Design Spec'
about: Create a "Request for Comment" design spec
title: "[RFC]: "
labels: dev design
assignees: kenotron

---

# Overview

Provide a high level summary of the feature you are trying to build

## Definitions of terms

<dl>
  <dt>term 1</dt>
  <dd>definition 1</dt>
  <dt>term 1</dt>
  <dd>definition 1</dt>
  <dt>term 1</dt>
  <dd>definition 1</dt>
</dl>

## Goals & non-goals

### Upstream dependencies

1. dep 1
2. dep 2
3. dep 3

### Downstream dependencies

1. dep 1
2. dep 2
3. dep 3

</details>

# Detailed Design

- Use diagrams

You can use mermaid:

```mermaid
  graph TD;
      A-->B;
      A-->C;
      B-->D;
      C-->D;
```

Use images by drag & drop

- Describe different feature areas and how they are architected (designed)
- Make sure another set of developer can roughly understand how your code will be organized after reading this section!

# Test Plan

- How will you make sure these features are to be tested
- Specify if leveraging any NEW test framework or techniques

# Performance, Resilience, Monitoring

- Discuss any impact on performance (both as a developer and as a consumer)
- Any expected change in the ability to deal with spotty networks (resilience?)
- How will you monitor or collect telemetry on the features?

# Security & Privacy

- Will the feature have any security or privacy issues?
- What are some ways to mitigate these issues?

# Accessibility

- How will your feature conform to accessibility guidelines
- Check on how you will handle:
  - Keyboard navigation
  - Screen Readers
  - Multiple monitor resolutions
  - High DPI support
  - High Contrast support

# World Readiness

- Globalization: how does yoru feature invoke display or manipulate display of currency, dates, timezones, names?
- Localization: how does your feature address localization?

# Execution Plan

List out the work items and/or PRs here:

- [ ] Work item 1: PR 1
- [ ] Work item 2: work item 2
- [ ] Work item 3:
  - [ ] PR 3
  - [ ] PR 4
