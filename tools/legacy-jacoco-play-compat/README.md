# Legacy Yona JaCoCo Play compatibility shim

This source is derived from JaCoCo 0.8.14 upstream
`org.jacoco.core/src/org/jacoco/core/internal/analysis/filter/AnnotationGeneratedFilter.java`
(tag `v0.8.14`).

The only local modification is that the exact Play 2.3 annotation descriptor
`Lplay/core/enhancers/PropertiesEnhancer$GeneratedAccessor;` is not treated as
a generated-code marker. All other JaCoCo 0.8.14 `Generated` matching remains
unchanged, including method annotations.

`scripts/legacy-jacoco-play-compat.mjs` builds the package outside the tracked
tree at `.agent/tools/legacy-jacoco-play-compat/`. The generated JAR is never
committed. Report use is explicit via
`YONA_LEGACY_JACOCO_PLAY_COMPAT=1`; without that setting, standard JaCoCo
0.8.14 report behavior is used.
