async function buildPlanes() {
    const tolerance = 0.001;
    const planesCount = 33028;
    const instancedGeometry = new THREE.PlaneGeometry(128 / resizer , 128 / resizer);

    instancedMesh = new THREE.InstancedMesh(instancedGeometry, materials[0], planesCount);

    const uvOffsets = new Float32Array(planesCount * 2); // Store UV offsets for each plane
    const colorArray = new Float32Array(planesCount * 4); // Store RGBA colors for each plane
    const categoryArray = new Float32Array(planesCount); // Store category for each plane

    const matrix = new THREE.Matrix4(); // Matrix for positioning
    const quaternion = new THREE.Quaternion(); // For rotation
    const planes = [];

    let planeIndex = 0;

    for (let i = 0; i < 5; i++) {
        let maxV = i == 6 ? 2608 : 6084;
        
        for (let j = 0; j < maxV; j++) {
            const coords = await getCoords(i, j);
            
            if (coords.x && coords.y && coords.z) {
                const position = new THREE.Vector3(coords.x, coords.y, coords.z);

                const directionToCenter = new THREE.Vector3(100,-250,100).sub(position).normalize();
                const up = new THREE.Vector3(0, 0, 1);

                quaternion.setFromUnitVectors(up, directionToCenter);

                matrix.identity();
                const scaleFactor = 200;
                matrix.scale(new THREE.Vector3(scaleFactor, scaleFactor, 1)); 
                matrix.setPosition(position);

                instancedMesh.setMatrixAt(planeIndex, matrix.clone());

                const cols = atlas.cols;
                const colIndex = j % cols;
                const rowIndex = Math.floor(j / cols);
                const xOffset = colIndex * (image.width / atlas.width);
                const yOffset = rowIndex * (image.height / atlas.width);
                uvOffsets[planeIndex * 2] = xOffset;
                uvOffsets[planeIndex * 2 + 1] = yOffset;

                if (coords.c1 > coords.c2 + tolerance && coords.c1 > coords.c3 + tolerance) {
                    colorArray.set([1.0, 1.0, 1.0, 0], planeIndex * 4); 
                    categoryArray[planeIndex] = 0; // Artificialia category
                } else if (coords.c2 > coords.c1 + tolerance && coords.c2 > coords.c3 + tolerance) {
                    colorArray.set([1.0, 1.0, 1.0, 0], planeIndex * 4); 
                    categoryArray[planeIndex] = 1; // Naturalia category
                } else if (coords.c3 > coords.c1 + tolerance && coords.c3 > coords.c2 + tolerance) {
                    colorArray.set([1.0, 1.0, 1.0, 0], planeIndex * 4); 
                    categoryArray[planeIndex] = 2; // Mirabilia category

                }
                
                planes.push({ index: planeIndex, connections: 0 });
                planeIndex++;
            }
        }
    }

    // Create attributes for UV offsets and colors
    instancedMesh.geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(uvOffsets, 2));
    instancedMesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colorArray, 4));
    instancedMesh.geometry.setAttribute('category', new THREE.InstancedBufferAttribute(categoryArray, 1));

    instancedMesh.material.onBeforeCompile = (shader) => {
      console.log("Modifying shader...");
        shader.vertexShader = `
            attribute vec2 uvOffset;
            attribute vec4 instanceColor;
            varying vec2 vUv;
            varying vec4 vColor; 

            ${shader.vertexShader}
        `.replace(
            '#include <uv_vertex>',
            `
            float uvPaddingX = 1.0 / ${atlas.width.toFixed(1)};
            float uvPaddingY = 1.0 / ${atlas.height.toFixed(1)};
            vUv = uvOffset + uv * vec2( (128.0 - 2.0) / ${atlas.width.toFixed(1)}, (128.0 - 2.0) / ${atlas.height.toFixed(1)}) + vec2(uvPaddingX, uvPaddingY);

            vColor = instanceColor;
            `
        );

        shader.fragmentShader = `
            varying vec2 vUv;
            varying vec4 vColor;

            ${shader.fragmentShader}
        `.replace(
            '#include <map_fragment>',
            `#ifdef USE_MAP
                vec4 texColor = texture2D(map, vUv);

                float threshold = 0.05; 
                if (texColor.r < threshold && texColor.g < threshold && texColor.b < threshold) {
                    discard;
                }

                diffuseColor *= texColor;
                diffuseColor.rgb *= vColor.rgb; 
                diffuseColor.a *= vColor.a; 
            #endif`
        );
        console.log("Shader modified successfully.");
    };

    // instancedMesh.material.transparent = true;
    // instancedMesh.material.premultipliedAlpha = false;
    // instancedMesh.material.depthWrite = true;
    // instancedMesh.material.depthTest = true;

    // instancedMesh.sortObjects = true;
    // instancedMesh.material.alphaTest = 0.5;
    // instancedMesh.material.blending = THREE.NormalBlending;

    // console.log(instancedMesh);
    instancedMesh.position.set(-100,250, -100)

    planesGroup.add(instancedMesh);
    scene.add(planesGroup);

    console.log(scene);
    
  }