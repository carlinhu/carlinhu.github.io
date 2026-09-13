document.addEventListener("DOMContentLoaded", () =>
{
    const ageElement = document.getElementById("age");
    if (!ageElement)
    {
        return;
    }

    // months are zero-based
    const birthDate = new Date(1995, 5, 15);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (today < birthdayThisYear)
    {
        age--;
    }

    ageElement.textContent = age;
});
