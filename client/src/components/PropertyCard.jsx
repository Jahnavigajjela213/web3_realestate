import { Link } from "react-router-dom";

export default function PropertyCard({ property }) {
  return (
    <article className="card">
      <h3>{property.name}</h3>
      <p>{property.location}</p>
      <p>Total Price: {property.totalPriceEth} ETH</p>
      <p>Available Shares: {property.availableShares} / {property.totalShares}</p>
      <p>Share Price: {property.sharePriceEth} ETH</p>
      <Link to={`/property/${property.id}`}>View Details</Link>
    </article>
  );
}
