import type { Scene } from "three";
import {
  Matrix4,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";

export class CSS3DObject extends Object3D {
  constructor(public element: HTMLElement) {
    super();

    this.element.style.position = "absolute";
    this.element.style.pointerEvents = "auto";
    this.element.style.userSelect = "none";
    this.element.setAttribute("draggable", "false");
  }

  copy(source: this, recursive: boolean) {
    super.copy(source, recursive);

    this.element = source.element.cloneNode(true) as HTMLElement;

    return this;
  }
}

export class CSS3DSprite extends CSS3DObject {
  public rotation2D = 0;

  constructor(public element: HTMLElement) {
    super(element);
  }

  copy(source: this, recursive: boolean) {
    super.copy(source, recursive);

    this.rotation2D = source.rotation2D;

    return this;
  }
}

const _matrix = new Matrix4();
const _matrix2 = new Matrix4();
const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();

function epsilon(value: number) {
  return Math.abs(value) < 1e-10 ? 0 : value;
}

function getCameraCSSMatrix(matrix: Matrix4) {
  const elements = matrix.elements;

  return `matrix3d(${epsilon(elements[0])},${epsilon(-elements[1])},${epsilon(
    elements[2]
  )},${epsilon(elements[3])},${epsilon(elements[4])},${epsilon(
    -elements[5]
  )},${epsilon(elements[6])},${epsilon(elements[7])},${epsilon(
    elements[8]
  )},${epsilon(-elements[9])},${epsilon(elements[10])},${epsilon(
    elements[11]
  )},${epsilon(elements[12])},${epsilon(-elements[13])},${epsilon(
    elements[14]
  )},${epsilon(elements[15])})`;
}

function getObjectCSSMatrix(matrix: Matrix4) {
  const elements = matrix.elements;
  const matrix3d = `matrix3d(${epsilon(elements[0])},${epsilon(
    elements[1]
  )},${epsilon(elements[2])},${epsilon(elements[3])},${epsilon(
    -elements[4]
  )},${epsilon(-elements[5])},${epsilon(-elements[6])},${epsilon(
    -elements[7]
  )},${epsilon(elements[8])},${epsilon(elements[9])},${epsilon(
    elements[10]
  )},${epsilon(elements[11])},${epsilon(elements[12])},${epsilon(
    elements[13]
  )},${epsilon(elements[14])},${epsilon(elements[15])})`;

  return `translate(-50%,-50%)${matrix3d}`;
}

export class CSS3DRenderer {
  #width: number = 0;
  #height: number = 0;
  #widthHalf: number = 0;
  #heightHalf: number = 0;
  #cache: {
    camera: { fov: number; style: string };
    objects: WeakMap<Object3D, { style: string }>;
  };

  // Document structure should be:
  //    containerElement DIV
  //      cameraElement DIV
  //        CSS3DObject
  //        CSS3DObject
  //        ...
  constructor(
    private containerElement: HTMLElement,
    private cameraElement: HTMLElement
  ) {
    this.#cache = {
      camera: { fov: 0, style: "" },
      objects: new WeakMap(),
    };

    this.containerElement.style.overflow = "hidden";

    this.cameraElement.style.transformStyle = "preserve-3d";
    this.cameraElement.style.pointerEvents = "none";
  }

  getSize() {
    return {
      width: this.#width,
      height: this.#height,
    };
  }

  setSize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    this.#widthHalf = width / 2;
    this.#heightHalf = height / 2;

    this.containerElement.style.width = `${width}px`;
    this.containerElement.style.height = `${height}px`;

    this.cameraElement.style.width = `${width}px`;
    this.cameraElement.style.height = `${height}px`;
  }

  render(scene: Scene, camera: PerspectiveCamera | OrthographicCamera) {
    const fov = camera.projectionMatrix.elements[5] * this.#heightHalf;

    if (this.#cache.camera.fov !== fov) {
      this.containerElement.style.perspective =
        camera instanceof PerspectiveCamera ? `${fov}px` : "";
      this.#cache.camera.fov = fov;
    }

    if (scene.matrixAutoUpdate) {
      scene.updateMatrixWorld();
    }
    if (camera.parent === null && camera.matrixAutoUpdate) {
      camera.updateMatrixWorld();
    }

    let tx: number, ty: number;
    let cameraCSSMatrix: string;

    if (camera instanceof OrthographicCamera) {
      tx = -(camera.right + camera.left) / 2;
      ty = (camera.top + camera.bottom) / 2;
      cameraCSSMatrix =
        `scale(${fov})` +
        `translate(${epsilon(tx)}px,${epsilon(ty)}px)` +
        `${getCameraCSSMatrix(camera.matrixWorldInverse)}`;
    } else if (camera instanceof PerspectiveCamera) {
      cameraCSSMatrix =
        `translateZ(${fov}px)` +
        `${getCameraCSSMatrix(camera.matrixWorldInverse)}`;
    } else {
      throw Error("Wrong camera type");
    }
    const style =
      cameraCSSMatrix + `translate(${this.#widthHalf}px,${this.#heightHalf}px)`;

    if (this.#cache.camera.style !== style) {
      this.cameraElement.style.transform = style;

      this.#cache.camera.style = style;
    }

    this.renderObject(scene, scene, camera, cameraCSSMatrix);
  }

  renderObject(
    object: Object3D,
    scene: Scene,
    camera: PerspectiveCamera | OrthographicCamera,
    cameraCSSMatrix: string
  ) {
    if (object instanceof CSS3DObject) {
      const visible =
        object.visible === true && object.layers.test(camera.layers) === true;
      object.element.style.display = visible === true ? "" : "none";

      if (visible === true) {
        (object as any).onBeforeRender(this, scene, camera);

        let style;

        if (object instanceof CSS3DSprite) {
          // http://swiftcoder.wordpress.com/2008/11/25/constructing-a-billboard-matrix/

          _matrix.copy(camera.matrixWorldInverse);
          _matrix.transpose();

          if (object.rotation2D !== 0)
            _matrix.multiply(_matrix2.makeRotationZ(object.rotation2D));

          object.matrixWorld.decompose(_position, _quaternion, _scale);
          _matrix.setPosition(_position);
          _matrix.scale(_scale);

          _matrix.elements[3] = 0;
          _matrix.elements[7] = 0;
          _matrix.elements[11] = 0;
          _matrix.elements[15] = 1;

          style = getObjectCSSMatrix(_matrix);
        } else {
          style = getObjectCSSMatrix(object.matrixWorld);
        }

        const element = object.element;
        const cachedObject = this.#cache.objects.get(object);

        if (cachedObject === undefined || cachedObject.style !== style) {
          element.style.transform = style;

          const objectData = { style: style };
          this.#cache.objects.set(object, objectData);
        }

        (object as any).onAfterRender(this, scene, camera);
      }
    }

    for (let i = 0, l = object.children.length; i < l; i++) {
      this.renderObject(object.children[i], scene, camera, cameraCSSMatrix);
    }
  }
}
