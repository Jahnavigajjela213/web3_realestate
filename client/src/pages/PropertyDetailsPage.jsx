import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProperties } from "../services/api";

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProperties()
      .then(setProperties)
      .catch((err) => setError(err.message || "Unable to load property"));
  }, []);

  const property = useMemo(
    () => properties.find((item) => Number(item.id) === Number(id)),
    [properties, id]
  );

  if (error) return <p className="error">{error}</p>;
  if (!property) return <p>Loading property details...</p>;

  return (
    <section className="card">
      <h2>{property.name}</h2>
      <p>Location: {property.location}</p>
      <p>Total Price: {property.totalPriceEth} ETH</p>
      <p>Total Shares: {property.totalShares}</p>
      <p>Available Shares: {property.availableShares}</p>
      <p>Share Price: {property.sharePriceEth} ETH</p>
      <Link to={`/transactions?propertyId=${property.id}`}>Buy Shares</Link>
    </section>
  );
}
