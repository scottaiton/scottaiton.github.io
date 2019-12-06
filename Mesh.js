class Patch {
  hasNbrOn(side) {
    return this.node.nbrs[side] != null;
  }
  hasSameNbrOn(side) {
    return this.node.nbrs[side] != null && this.node.nbrs[side].patch != null;
  }
  hasFinerNbrOn(side) {
    return this.node.nbrs[side] != null && this.node.nbrs[side].hasLeaves();
  }
  hasCoarserNbrOn(side) {
    return (
      this.node.parent != null &&
      this.node.parent.nbrs[side] != null &&
      this.node.parent.nbrs[side].patch != null
    );
  }
  getNbrOn(side) {
    if (this.hasSameNbrOn(side)) {
      return this.node.nbrs[side].patch;
    } else if (this.hasCoarserNbrOn(side)) {
      return this.node.parent.nbrs[side].patch;
    } else if (this.hasFinerNbrOn(side)) {
      switch (side) {
        case 0:
          return [
            this.node.nbrs[side].leaves[1].patch,
            this.node.nbrs[side].leaves[3].patch
          ];
        case 1:
          return [
            this.node.nbrs[side].leaves[0].patch,
            this.node.nbrs[side].leaves[2].patch
          ];
        case 2:
          return [
            this.node.nbrs[side].leaves[2].patch,
            this.node.nbrs[side].leaves[3].patch
          ];
        case 3:
          return [
            this.node.nbrs[side].leaves[0].patch,
            this.node.nbrs[side].leaves[1].patch
          ];
      }
    }
  }
  getIndex(x, y) {
    return this.index * this.mx * this.my + x + this.mx * y;
  }
  isLowerOnCoarser(side) {
    return !(this.node.quad_on_parent & ~(1 << Side.axis(side)));
  }
  hasCaddyCornerNbr() {
    var nbr_patch = null;
    if (this.hasSameNbrOn(3) || this.hasCoarserNbrOn(3)) {
      nbr_patch = this.getNbrOn(3);
    } else if (this.hasFinerNbrOn(3)) {
      nbr_patch = this.getNbrOn(3)[1];
    }
    if (nbr_patch == null) {
      return false;
    } else {
      return (
        nbr_patch.hasSameNbrOn(1) ||
        nbr_patch.hasCoarserNbrOn(1) ||
        nbr_patch.hasFinerNbrOn(1)
      );
    }
  }
  getCaddyCornerNbr() {
    var nbr_patch = null;
    if (this.hasSameNbrOn(3) || this.hasCoarserNbrOn(3)) {
      nbr_patch = this.getNbrOn(3);
    } else if (this.hasFinerNbrOn(3)) {
      nbr_patch = this.getNbrOn(3)[1];
    }
    var caddy_patch = null;
    if (nbr_patch != null) {
      if (nbr_patch.hasSameNbrOn(1) || nbr_patch.hasCoarserNbrOn(1)) {
        caddy_patch = nbr_patch.getNbrOn(1);
      } else if (nbr_patch.hasFinerNbrOn(1)) {
        caddy_patch = nbr_patch.getNbrOn(1)[0];
      }
    }
    return caddy_patch;
  }
}
class Side {
  static opposite(side) {
    return side ^ 1;
  }
  static axis(side) {
    return side >> 1;
  }
  static isLowerOnAxis() {
    return !(side & 1);
  }
  static getLowerOnAxis(axis) {
    return axis << 1;
  }
  static getUpperOnAxis(axis) {
    return (axis << 1) | 1;
  }
  static upperOnAxis(side) {
    return (side & 1) == 0;
  }
}
class Quadrant {
  static getNbrOnAxis(quad, axis) {
    return quad ^ (1 << axis);
  }
  static isLowerOnAxis(quad, axis) {
    return !(quad & (1 << axis));
  }
}
class Node {
  constructor() {
    this.nbrs = new Array(4);
  }
  addLeaves() {
    this.leaves = new Array(4);
    for (var quad = 0; quad < 4; quad++) {
      this.leaves[quad] = new Node();
      this.leaves[quad].parent = this;
      this.leaves[quad].quad_on_parent = quad;
    }
    //set internal neighbors (same parent)
    for (var quad = 0; quad < 4; quad++) {
      var leaf = this.leaves[quad];
      for (var axis = 0; axis < 2; axis++) {
        var nbr_leaf = this.leaves[Quadrant.getNbrOnAxis(quad, axis)];
        var side;
        var nbr_side;
        if (Quadrant.isLowerOnAxis(quad, axis)) {
          side = Side.getUpperOnAxis(axis);
          nbr_side = Side.getLowerOnAxis(axis);
        } else {
          side = Side.getLowerOnAxis(axis);
          nbr_side = Side.getUpperOnAxis(axis);
        }
        //link neighbors
        leaf.nbrs[side] = nbr_leaf;
        nbr_leaf.nbrs[nbr_side] = leaf;
      }
    }
    //set external neighbors (different parent)
    for (var quad = 0; quad < 4; quad++) {
      var leaf = this.leaves[quad];
      for (var axis = 0; axis < 2; axis++) {
        var side;
        var nbr_side;
        if (Quadrant.isLowerOnAxis(quad, axis)) {
          side = Side.getLowerOnAxis(axis);
          nbr_side = Side.getUpperOnAxis(axis);
        } else {
          side = Side.getUpperOnAxis(axis);
          nbr_side = Side.getLowerOnAxis(axis);
        }
        if (this.nbrs[side] != null && this.nbrs[side].hasLeaves()) {
          var nbr_leaf = this.nbrs[side].leaves[
            Quadrant.getNbrOnAxis(quad, axis)
          ];
          //link neighbors
          leaf.nbrs[side] = nbr_leaf;
          nbr_leaf.nbrs[nbr_side] = leaf;
        }
      }
    }
  }
  hasLeaves() {
    return this.leaves != null;
  }
}
class Tree {
  constructor(patches) {
    this.xmin = patches[0].xlow;
    this.xmax = patches[0].xlow;
    this.ymin = patches[0].ylow;
    this.ymax = patches[0].ylow;
    this.level_map = new Map();
    this.root = new Node();
    //iterate to get bounds
    for (var i = 0; i < patches.length; i++) {
      var patch = patches[i];
      //get bounds
      this.xmin = Math.min(patch.xlow, this.xmin);
      this.xmax = Math.max(patch.xlow + patch.mx * patch.dx, this.xmax);
      this.ymin = Math.min(patch.ylow, this.ymin);
      this.ymax = Math.max(patch.ylow + patch.my * patch.dy, this.ymax);
    }
    //put patches in tree
    for (var i = 0; i < patches.length; i++) {
      var patch = patches[i];
      //get index on level
      var xi = Math.round((patch.xlow - this.xmin) / (patch.dx * patch.mx));
      var yi = Math.round((patch.ylow - this.ymin) / (patch.dy * patch.my));
      //use bits to determine position in tree
      var curr_node = this.root;
      for (var bit = patch.amr_level - 1; bit >= 0; bit--) {
        var leaf_idx = (((yi >> bit) & 1) << 1) | ((xi >> bit) & 1);
        if (!curr_node.hasLeaves()) {
          curr_node.addLeaves();
        }
        curr_node = curr_node.leaves[leaf_idx];
      }
      //link tree and patch
      curr_node.patch = patch;
      patch.node = curr_node;
    }
  }
}
class Mesh {
  constructor(patches) {
    this.patches = patches;
    if (patches.length > 0) {
      this.tree = new Tree(patches);
      this._setMinMax();
    }
  }
  _setMinMax() {
    this.min_value = patches[0].q[0];
    this.max_value = patches[0].q[0];
    for (var i = 0; i < patches.length; i++) {
      var patch = patches[i];
      for (var j = 0; j < patch.mx * patch.my; j++) {
        this.min_value = Math.min(patch.q[j], this.min_value);
        this.max_value = Math.max(patch.q[j], this.max_value);
      }
    }
  }
}
