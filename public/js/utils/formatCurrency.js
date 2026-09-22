export function formatCurrency(value) {

    const number = Number(value) || 0;

    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN"
        }
    ).format(number);
}