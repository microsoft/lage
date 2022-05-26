---
name: 'RFC: Design Spec'
about: Create a "Request for Comment" design spec
title: "[RFC]: "
labels: dev design
assignees: kenotron

---

# Overview

# Summary of Feature
Provide a high level summary of the feature you are trying to build


<details>
  <summary>

## Definitions of terms

</summary>

:term
::definition
:another term
::a longer definition
    stretching over two lines
:a third term
::an even longer definition

    This definition has two paragraphs!

</details>
<details>
<summary>

## Goals & non-goals

</summary>

### Upstream dependencies
1. dep 1
2. dep 2
3. dep 3

### Downstream dependencies
1. dep 1
2. dep 2
3. dep 3

</details>

## Detailed Design
	• Describe with diagrams
	• Describe different feature areas and how they are architected (designed)
	• Make sure another set of developer can roughly understand how your code will be organized after reading this section!
3. Test Plan
	• How will you make sure these features are to be tested
	• Specify if leveraging any NEW test framework or techniques
4. Performance, Resilience, Monitoring
	• Discuss any impact on performance (both as a developer and as a consumer)
	• Any expected change in the ability to deal with spotty networks (resilience?)
	• How will you monitor or collect telemetry on the features?
5. Security & Privacy
	• Will the feature have any security or privacy issues?
	• What are some ways to mitigate these issues?
6. Accessibility
	• How will your feature conform to accessibility guidelines
	• Check on how you will handle:
		○ Keyboard navigation
		○ Screen Readers
		○ Multiple monitor resolutions
		○ High DPI support
		○ High Contrast support
7. World Readiness
	• Globalization: how does yoru feature invoke display or manipulate display of currency, dates, timezones, names?
	• Localization: how does your feature address localization?
