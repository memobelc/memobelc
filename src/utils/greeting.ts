export function getGreeting(): string {
    const currentHour = new Date().getHours();

    if (currentHour < 12) {
        return "GOOD MORNING";
    } else if (currentHour < 18) {
        return "GOOD AFTERNOON";
    } else {
        return "GOOD EVENING";
    }
}