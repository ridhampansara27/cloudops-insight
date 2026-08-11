# Import FastAPI's synchronous test client.
from fastapi.testclient import TestClient

# Import the CloudOps FastAPI application.
from app.main import app


# Verify that the application liveness endpoint works.
def test_liveness() -> None:
    # Start FastAPI inside its normal application lifecycle.
    with TestClient(app) as client:
        # Request the lightweight liveness endpoint.
        response = client.get(
            "/health/live",
        )

    # Verify the endpoint returned HTTP 200.
    assert response.status_code == 200

    # Verify the expected JSON response.
    assert response.json() == {
        "status": "alive",
    }


# Verify the root API discovery endpoint.
def test_root() -> None:
    # Start FastAPI using the test client.
    with TestClient(app) as client:
        # Request the root API endpoint.
        response = client.get("/")

    # Verify the request succeeded.
    assert response.status_code == 200

    # Verify the service identifies itself correctly.
    assert response.json()["service"] == "CloudOps Insight API"
