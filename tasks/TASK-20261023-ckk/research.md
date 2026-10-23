<Research — Library Tag Filter Optimistic UI & Skeleton Loading State>
## Open Questions
- [Q1.1: Should clicking a tag chip immediately show an optimistic active state and use `router.replace`?] → Answered by user in Design Grill Round 1: Yes, immediately highlight the clicked tag chip optimistically and use `router.replace` to avoid polluting history.
- [Q1.2: How should the song list indicate loading while the filter transition is pending?] → Answered by user in Design Grill Round 1: Option A — Replace the song list rows immediately with 10 animated skeleton cards matching `src/app/library/loading.tsx`.
- [Q1.3: Should the transition skeleton state apply only to `TagFilterBar` or across all Library filter/pagination controls?] → Answered by user in Design Grill Round 1: Apply consistently across all Library filter/pagination controls (`TagFilterBar`, `AlphabetFilter`, `SearchBar`, `PaginationControls`, `PageSizeSelect`) while preserving backward compatibility on `/setlists`.
</Research — Library Tag Filter Optimistic UI & Skeleton Loading State>
