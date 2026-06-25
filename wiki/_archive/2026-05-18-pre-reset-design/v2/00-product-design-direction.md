# Product Design Direction

## 1. Problem Frame

University course preparation is often treated as an individual presentation
task rather than as a structured course-design process. Instructors may have to
assemble a course from slides, notes, textbooks, papers, colleague material, and
prior teaching artifacts without a shared system for reviewing whether the
course is coherent, teachable, or well supported.

The product direction is to help instructors turn existing teaching and
reference material into a course structure they can inspect, refine, own, and
deliver in a non-linear way. The system should not assume the instructor
already has a clean course plan.

## 2. Target User Reality

The initial user is an instructor who needs to prepare or revise a course but
may not have a well-organized course model at the start.

They may begin with:

- lecture slides
- personal notes
- textbook excerpts
- research papers
- colleague notes
- previous course material
- rough topic lists

The user's goal is not only to generate content quickly. The goal is to build a
course they understand well enough to teach, revise, defend, and navigate from
multiple instructional paths.

## 3. Product Goal

The product should provide a framework for disorganized or under-supported
course preparation. It should help an instructor review source material, surface
candidate course structure, inspect the reasoning behind that structure, and
gradually design a course over time.

The intended experience should be thoughtful and smooth, but not effortless. A
good course still requires persistent instructor effort. The product should make
that effort more directed, inspectable, and recoverable instead of replacing it
with opaque generation.

The product should also help instructors work between non-linear knowledge
structure and linear delivery. Instead of forcing every course into a single
fixed sequence, the system should expose a map of knowledge nodes while also
letting the instructor build a clear presentation timeline from selected nodes.

## 4. Non-Goals

The product is not primarily an AI course generator.

The product should not promise that a course can be created correctly from a
single prompt, nor should it treat generated material as trusted output.

The product is also not primarily an LMS. Publishing, grading, enrollment,
certificates, completion tracking, and learner administration are downstream
concerns. The v2 design focus is upstream course structure and review.

## 5. Source Material Scope

The v1 source scope should favor formats that preserve authoring structure.

In scope for early design:

- PPTX: slide titles, bullets, speaker notes, visible layout regions
- DOCX: headings, paragraphs, lists, tables
- Markdown or plain text: clean baseline structure

Likely out of scope for v1:

- PDF ingestion
- OCR-heavy scanned material
- arbitrary web crawling
- full textbook-scale ingestion

PDF is deferred because it often preserves rendered layout rather than author
intent. It may return later, but it should not be the first viability test.

For v1, PPTX import may use a simple one-to-one mapping:

- one PowerPoint slide becomes one knowledge node
- the slide title becomes the node title
- slide content becomes the node's attached editable document
- the imported slide order becomes the initial traversal timeline

This keeps the first import model close to the PowerPoint mental model while
moving the content into the KnowledgeNetwork node-and-map environment.

## 6. Product Model

The current product model has six layers.

### Source Layer

The source layer ingests instructor-provided material and converts it into
stable source blocks. A source block is a reproducible unit of evidence such as
a slide title, bullet, paragraph, table, or note.

This layer should be deterministic where possible. Its job is not to understand
the course. Its job is to preserve provenance.

For PPTX import, the source layer should also be able to mirror each slide into
a node-attached document. The first version does not need to semantically
categorize every slide. It should faithfully convert slide content into block
editor content that the instructor can edit.

### Course Ontology Layer

The course ontology layer defines the valid shapes of course knowledge before
candidate generation begins. It should describe the allowed node types,
relationship types, required evidence links, and structural constraints that the
system uses to reason about a course.

Early ontology objects may include:

- concepts
- definitions
- learning objectives
- lesson units
- examples
- assessments

Early relationship types may include:

- prerequisite of
- explains
- assesses
- belongs to
- supports

This layer should make the course model explicit enough to guide candidate
generation, validation, review, and map grouping.

### Ontology-Guided Interpretation Layer

The ontology-guided interpretation layer proposes candidate course knowledge
from the source blocks within the structure defined by the course ontology.

Candidate objects may include:

- concepts
- definitions
- prerequisite relationships
- learning objectives
- examples
- lesson units
- assessments
- course sequence suggestions

These objects are candidates, not accepted truth. They must remain linked to
their source evidence.

This layer may use LLMs as an interpretation engine, but the product is not
centered on free-form AI generation. The ontology should guide what the LLM is
asked to produce, which relations are valid, and what evidence must be attached
to a candidate.

### Validation Layer

The validation layer checks candidate structure before the instructor is asked
to trust it.

Validation may include:

- source provenance checks
- duplicate detection
- missing prerequisite detection
- weak or unsupported candidate detection
- inconsistent granularity detection
- sequence coherence checks
- type and relation validity checks

The validation layer should constrain and explain structure. It should not claim
to be an absolute truth oracle.

### Review Layer

The review layer is where the instructor works.

The instructor should be able to inspect source evidence, accept or reject
candidates, edit proposed structure, walk through the course path, and gradually
approve a personal course version.

The review experience should make the instructor the first learner of the course
they are designing.

For v1, review should include direct editing of the node-attached document. A
knowledge node is not only a graph object; it also carries editable content that
may initially mirror the imported slide.

### Map And Timeline Delivery Layer

The map and timeline delivery layer presents approved or in-progress course
knowledge as both a navigable map and a linear presentation timeline.

The map helps the instructor see:

- concept clusters
- prerequisite neighborhoods
- alternate paths through related material
- isolated or weakly connected nodes
- high-level course regions and local detail

The timeline helps the instructor decide what to teach and in what order. The
instructor should be able to preview nodes from the map, drag selected nodes
into a sidebar timeline, reorder them, and review or present them linearly.

The timeline should also support collapsible traversal groups. A traversal group
marks a teaching boundary inside the timeline, such as a lecture section, unit,
week, or presentation chunk. Users should be able to expand or shrink a group,
drag nodes between groups, reorder nodes within a group, and reorder whole
groups when useful.

The map is not only a visualization after the course is complete. It is part of
the design and delivery workflow. The timeline is the delivery path through that
map.

## 7. User Experience Timeline

The current UX timeline is:

1. Instructor starts with incomplete or disorganized course material.
2. Instructor imports structured source material.
3. For PPTX, each slide may become one knowledge node with an attached editable
   document.
4. Imported slide order becomes the initial traversal timeline.
5. System extracts source blocks with provenance.
6. Course ontology defines the valid candidate types and relations.
7. System proposes ontology-guided candidate course structure.
8. System validates candidate structure and highlights issues.
9. Instructor previews nodes on the map and edits node-attached documents.
10. Instructor drags selected nodes into the traversal timeline.
11. Instructor reorders nodes and creates collapsible traversal groups.
12. Instructor reviews candidates against source evidence.
13. Instructor edits, rejects, merges, or approves candidates.
14. Instructor walks through the emerging course path.
15. Instructor uses the map to inspect grouped knowledge regions and alternate
   teaching paths.
16. Instructor produces a personal approved course version.

This timeline is not a promise that the system can finish the course for the
instructor. It is a workflow for making course-design effort more structured.

## 8. System Responsibility Boundaries

The system should be responsible for:

- preserving source provenance
- defining valid course-knowledge types and relations
- proposing ontology-guided candidate structure
- making gaps and inconsistencies visible
- grouping related knowledge nodes for map-based navigation
- converting imported slide content into node-attached editable documents
- preserving imported slide order as an initial traversal timeline
- supporting drag-and-drop construction of a linear traversal path
- supporting collapsible traversal groups inside that path
- supporting review and revision
- supporting non-linear delivery paths
- separating proposed, rejected, edited, and approved knowledge

The instructor should remain responsible for:

- judging pedagogical appropriateness
- resolving ambiguous meaning
- deciding course emphasis
- approving final structure
- adapting the course to their teaching style and students

## 9. v1 Viability Gates

The v1 design should be considered viable only if it can demonstrate:

- source material can be decomposed into stable blocks
- PPTX slides can be mirrored into editable node documents
- imported slide order can become an editable traversal timeline
- a minimal course ontology can guide candidate generation
- candidates can be linked back to source blocks
- proposed concepts and relations can stay separate from approved knowledge
- validation can identify at least some useful structural issues
- related knowledge nodes can be grouped into useful map regions
- nodes can be dragged into a linear traversal path
- traversal groups can mark teaching boundaries inside that path
- the instructor review workflow is clearer than manually reading all material
  from scratch

If these gates fail, the project should reconsider whether the ontology and
review layers are carrying enough product value.

## 10. Open Questions

- What is the smallest useful source format for v1: PPTX, DOCX, Markdown, or a
  mixed folder?
- What source-block granularity is useful without becoming noisy?
- What is the minimum useful course ontology for v1?
- How should slide content map into block-editor content?
- Which candidate object should be designed first: concept, lesson unit,
  learning objective, or prerequisite edge?
- What does the instructor review first: source blocks, concepts, objectives, or
  a generated course path?
- What validation checks are deterministic enough for v1?
- What grouping logic is good enough for a first non-linear map experience?
- What timeline grouping interaction is simple enough for v1?
- What does an approved course version contain at the end of v1?
