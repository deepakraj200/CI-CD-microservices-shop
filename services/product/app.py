import os

from flask import Flask, jsonify

PRODUCTS = {
    1: {"id": 1, "name": "Mechanical Keyboard", "price": 89.99, "stock": 25},
    2: {"id": 2, "name": "Wireless Mouse", "price": 29.5, "stock": 60},
    3: {"id": 3, "name": "USB-C Hub", "price": 45.0, "stock": 40},
}


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/healthz")
    def healthz():
        return jsonify(status="ok", service="product")

    @app.get("/products")
    def list_products():
        return jsonify(list(PRODUCTS.values()))

    @app.get("/products/<int:product_id>")
    def get_product(product_id: int):
        product = PRODUCTS.get(product_id)
        if product is None:
            return jsonify(error="product not found"), 404
        return jsonify(product)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5001")))
