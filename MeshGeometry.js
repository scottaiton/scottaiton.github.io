class MeshGeometry {
  constructor(gl, mesh) {
    if (mesh.patches.length > 0) {
      this.empty = false;
      this.generatePositions(gl, mesh.patches);
      //if (this.positionBuffer.numItems > 1 << 16) {
      // alert("Mesh has grater than 56k points");
      // return;
      //}
      this.generateVertexIndexes(gl, mesh.patches);
    } else {
      this.empty = true;
    }
  }
  generatePositions(gl, patches) {
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    var mx = 0;
    var my = 0;
    if (patches.length > 0) {
      mx = patches[0].mx;
      my = patches[0].my;
    }
    var pos_array = new Array(3 * patches.length * mx * my);
    for (var patch_no = 0; patch_no < patches.length; patch_no++) {
      var patch = patches[patch_no];
      for (var xi = 0; xi < mx; xi++) {
        for (var yi = 0; yi < my; yi++) {
          pos_array[3 * (patch_no * mx * my + xi + yi * mx) + 0] =
            patch.xlow + (0.5 + xi) * patch.dx;
          pos_array[3 * (patch_no * mx * my + xi + yi * mx) + 1] =
            patch.ylow + (0.5 + yi) * patch.dy;
          pos_array[3 * (patch_no * mx * my + xi + yi * mx) + 2] =
            patch.q[xi + yi * mx];
        }
      }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos_array), gl.STATIC_DRAW);
    this.positionBuffer.itemSize = 3;
    this.positionBuffer.numItems = mx * my * patches.length;
  }
  generateVertexIndexes(gl, patches) {
    this.vertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
    var mx = 0;
    var my = 0;
    if (patches.length > 0) {
      mx = patches[0].mx;
      my = patches[0].my;
    }
    var pos_array = new Array(3 * 2 * patches.length * mx * my);
    for (var patch_no = 0; patch_no < patches.length; patch_no++) {
      var patch = patches[patch_no];
      patch.index = patch_no;
      for (var xi = 0; xi < mx - 1; xi++) {
        var x_lower = xi;
        var x_upper = xi + 1;
        for (var yi = 0; yi < my - 1; yi++) {
          var y_lower = yi;
          var y_upper = yi + 1;
          pos_array[6 * (patch.index * mx * my + xi + yi * mx) + 0] =
            patch_no * mx * my + x_lower + my * y_lower;
          pos_array[6 * (patch.index * mx * my + xi + yi * mx) + 1] =
            patch_no * mx * my + x_lower + my * y_upper;
          pos_array[6 * (patch.index * mx * my + xi + yi * mx) + 2] =
            patch_no * mx * my + x_upper + my * y_upper;
          pos_array[6 * (patch.index * mx * my + xi + yi * mx) + 3] =
            patch_no * mx * my + x_lower + my * y_lower;
          pos_array[6 * (patch.index * mx * my + xi + yi * mx) + 4] =
            patch_no * mx * my + x_upper + my * y_lower;
          pos_array[6 * (patch.index * mx * my + xi + yi * mx) + 5] =
            patch_no * mx * my + x_upper + my * y_upper;
        }
      }
    }
    this.vertexIndexBuffer.numPatchItems = pos_array.length;
    for (var patch_no = 0; patch_no < patches.length; patch_no++) {
      var corner_sw, corner_se, corner_nw, corner_ne;
      var patch = patches[patch_no];
      corner_sw = patch.getIndex(mx - 1, my - 1);
      corner_ne = null;
      //north boundary
      if (patch.hasSameNbrOn(3)) {
        var nbr_patch = patch.getNbrOn(3);
        var y_lower = patch.my - 1;
        var y_upper = 0;
        for (var xi = 0; xi < mx - 1; xi++) {
          var x_lower = xi;
          var x_upper = xi + 1;
          pos_array.push(patch.index * mx * my + x_lower + my * y_lower);
          pos_array.push(nbr_patch.index * mx * my + x_lower + my * y_upper);
          pos_array.push(nbr_patch.index * mx * my + x_upper + my * y_upper);
          pos_array.push(patch.index * mx * my + x_lower + my * y_lower);
          pos_array.push(patch.index * mx * my + x_upper + my * y_lower);
          pos_array.push(nbr_patch.index * mx * my + x_upper + my * y_upper);
        }
        //set corner indexes
        corner_nw = nbr_patch.index * mx * my + (mx - 1) + mx * 0;
      } else if (patch.hasFinerNbrOn(3)) {
        var nbr_patches = patch.getNbrOn(3);
        for (var xi = 0; xi < 2 * mx - 1; xi++) {
          var lower_fine = nbr_patches[Math.floor(xi / mx)].getIndex(
            xi % mx,
            0
          );
          var upper_fine = nbr_patches[Math.floor((xi + 1) / mx)].getIndex(
            (xi + 1) % mx,
            0
          );
          var lower_coarse = patch.getIndex(Math.floor(xi / 2), my - 1);
          var upper_coarse = patch.getIndex(Math.floor((xi + 1) / 2), my - 1);
          if (lower_coarse != upper_coarse) {
            pos_array.push(lower_coarse);
            pos_array.push(lower_fine);
            pos_array.push(upper_fine);
            pos_array.push(lower_coarse);
            pos_array.push(upper_coarse);
            pos_array.push(upper_fine);
          } else {
            pos_array.push(lower_fine);
            pos_array.push(upper_fine);
            pos_array.push(lower_coarse);
          }
        }
        corner_nw = nbr_patches[1].getIndex(mx - 1, 0);
      } else if (patch.hasCoarserNbrOn(3)) {
        var nbr_patch = patch.getNbrOn(3);
        var is_lower_on_coarser = patch.isLowerOnCoarser(3);
        var start = is_lower_on_coarser ? 0 : my;
        for (var xi = 0; xi < mx - 1; xi++) {
          //
          var lower_fine = patch.getIndex(xi, my - 1);
          var upper_fine = patch.getIndex(xi + 1, my - 1);
          var lower_coarse = nbr_patch.getIndex(
            Math.floor((start + xi) / 2),
            0
          );
          var upper_coarse = nbr_patch.getIndex(
            Math.floor((start + xi + 1) / 2),
            0
          );
          if (lower_coarse != upper_coarse) {
            pos_array.push(lower_coarse);
            pos_array.push(lower_fine);
            pos_array.push(upper_fine);
            pos_array.push(lower_coarse);
            pos_array.push(upper_coarse);
            pos_array.push(upper_fine);
          } else {
            pos_array.push(lower_fine);
            pos_array.push(upper_fine);
            pos_array.push(lower_coarse);
          }
        }
        //set corner indexes
        if (is_lower_on_coarser) {
          corner_nw = nbr_patch.getIndex(Math.floor((mx - 1) / 2), 0);
          corner_ne = nbr_patch.getIndex(Math.floor(mx / 2), 0);
        } else {
          corner_nw = nbr_patch.getIndex(mx - 1, 0);
        }
      }
      //east boundary
      if (patch.hasSameNbrOn(1)) {
        var nbr_patch = patch.node.nbrs[1].patch;
        var x_lower = patch.mx - 1;
        var x_upper = 0;
        for (var yi = 0; yi < my - 1; yi++) {
          var y_lower = yi;
          var y_upper = yi + 1;
          pos_array.push(patch.index * mx * my + x_lower + my * y_lower);
          pos_array.push(patch.index * mx * my + x_lower + my * y_upper);
          pos_array.push(nbr_patch.index * mx * my + x_upper + my * y_upper);
          pos_array.push(patch.index * mx * my + x_lower + my * y_lower);
          pos_array.push(nbr_patch.index * mx * my + x_upper + my * y_lower);
          pos_array.push(nbr_patch.index * mx * my + x_upper + my * y_upper);
        }
        //set corner indexes
        corner_se = nbr_patch.index * mx * my + 0 + mx * (my - 1);
      } else if (patch.hasFinerNbrOn(1)) {
        var nbr_patches = patch.getNbrOn(1);
        for (var yi = 0; yi < 2 * my - 1; yi++) {
          var lower_fine = nbr_patches[Math.floor(yi / my)].getIndex(
            0,
            yi % my
          );
          var upper_fine = nbr_patches[Math.floor((yi + 1) / my)].getIndex(
            0,
            (yi + 1) % my
          );
          var lower_coarse = patch.getIndex(mx - 1, Math.floor(yi / 2));
          var upper_coarse = patch.getIndex(mx - 1, Math.floor((yi + 1) / 2));
          if (lower_coarse != upper_coarse) {
            pos_array.push(lower_coarse);
            pos_array.push(upper_coarse);
            pos_array.push(upper_fine);
            pos_array.push(lower_coarse);
            pos_array.push(lower_fine);
            pos_array.push(upper_fine);
          } else {
            pos_array.push(lower_fine);
            pos_array.push(upper_fine);
            pos_array.push(lower_coarse);
          }
        }
        //set corner indexes
        corner_se = nbr_patches[1].getIndex(0, my - 1);
      } else if (patch.hasCoarserNbrOn(1)) {
        var nbr_patch = patch.getNbrOn(1);
        var is_lower_on_coarser = patch.isLowerOnCoarser(1);
        var start = is_lower_on_coarser ? 0 : my;
        for (var yi = 0; yi < my - 1; yi++) {
          var lower_fine = patch.getIndex(mx - 1, yi);
          var upper_fine = patch.getIndex(mx - 1, yi + 1);
          var lower_coarse = nbr_patch.getIndex(
            0,
            Math.floor((start + yi) / 2)
          );
          var upper_coarse = nbr_patch.getIndex(
            0,
            Math.floor((start + yi + 1) / 2)
          );
          if (lower_coarse != upper_coarse) {
            pos_array.push(lower_coarse);
            pos_array.push(upper_coarse);
            pos_array.push(upper_fine);
            pos_array.push(lower_coarse);
            pos_array.push(lower_fine);
            pos_array.push(upper_fine);
          } else {
            pos_array.push(lower_fine);
            pos_array.push(upper_fine);
            pos_array.push(lower_coarse);
          }
        }
        //set corner indexes
        if (is_lower_on_coarser) {
          corner_se = nbr_patch.getIndex(0, Math.floor((my - 1) / 2));
          corner_ne = nbr_patch.getIndex(0, Math.floor(my / 2));
        } else {
          corner_se = nbr_patch.getIndex(0, my - 1);
        }
      }
      if (corner_ne != null) {
        pos_array.push(corner_sw);
        pos_array.push(corner_nw);
        pos_array.push(corner_ne);
        pos_array.push(corner_sw);
        pos_array.push(corner_se);
        pos_array.push(corner_ne);
      } else if (patch.hasCaddyCornerNbr()) {
        corner_ne = patch.getCaddyCornerNbr().getIndex(0, 0);
        pos_array.push(corner_sw);
        pos_array.push(corner_nw);
        pos_array.push(corner_ne);
        pos_array.push(corner_sw);
        pos_array.push(corner_se);
        pos_array.push(corner_ne);
      }
    }

    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(pos_array),
      gl.STATIC_DRAW
    );
    this.vertexIndexBuffer.itemSize = 1;
    this.vertexIndexBuffer.numItems = pos_array.length;
  }
}
