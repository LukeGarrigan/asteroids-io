class Food {
  constructor(x, y, r, id) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.id = id;
  }

  display() {
    noFill();
    stroke(255);
    ellipse(this.x, this.y, this.r, this.r);
  }
}
