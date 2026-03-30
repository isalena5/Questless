export function formatDateTime(isoString) {
    const date = new Date(isoString);

    // Date (DD/MM/YY)
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    const formattedDate = `${day}/${month}/${year}`;

    // Time (12h format)
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    const formattedTime = `${hours}:${minutes} ${ampm}`;

    return {
        formattedDate,
        formattedTime
    };
}