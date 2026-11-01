from app import create_app


def client():
    return create_app().test_client()


def test_health():
    res = client().get("/healthz")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_list_products():
    res = client().get("/products")
    assert res.status_code == 200
    assert len(res.get_json()) >= 1


def test_get_product():
    res = client().get("/products/1")
    assert res.status_code == 200
    assert res.get_json()["id"] == 1


def test_get_product_not_found():
    res = client().get("/products/999")
    assert res.status_code == 404
