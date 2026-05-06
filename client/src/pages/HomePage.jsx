import { useEffect, useState } from "react";
import { fetchProperties } from "../services/api";
import PropertyCard from "../components/PropertyCard";

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchProperties();
        setProperties(data.filter((item) => item.isActive));
      } catch (err) {
        setError(err.message || "Failed to load properties");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p>Loading properties...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h2>Available Properties</h2>
      <div className="grid">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}
