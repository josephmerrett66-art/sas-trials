# Woodland trees

Selected from Quaternius's Stylized Nature MegaKit Standard (CC0 1.0).
Source supplied locally by the user; original licence retained in LICENSE.txt.

Pine_5, Pine_4 and CommonTree_4 establish three coherent woodland families.
The game uses the glTF geometry and painted alpha-cutout foliage with shared
Lambert lighting, restrained green/brown tints, small instance shade variation,
existing weather sway and the existing torch. Bark and pine textures are resized
to 512 and 1024 respectively; unused normal-map material bindings are removed.
At load time, spatial clustering reduces fine bark triangles (Pine_5: 488 to
466; Pine_4: 2160 to 1072; CommonTree_4: 3280 to 1397). Foliage triangles and
painted alpha cutouts remain intact. Bounds stay within 1.8% of tree height.

No kit terrain, stone paths, rocks or ground cover are imported.

Spatial woodland fields create broad stands, regeneration trees and openings.
Meshes are instanced by family and material and culled against the current fog.
Hidden procedural tree silhouettes supply the existing one-time sun shadow bake;
they are excluded from the normal colour pass and visibility indexing. Their
shadows approximate the kit crowns. No additional lights or shadow passes.
