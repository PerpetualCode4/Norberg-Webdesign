import random
import string

def generer_passord(lengde=12, store_bokstavar=True, tal=True, spesialtegn=True):
    """
    Genererer eit tilfeldig passord.

    Parametrar:
        lengde        - antal teikn i passordet (standard: 12)
        store_bokstavar - inkluder store bokstavar (standard: True)
        tal           - inkluder tal (standard: True)
        spesialtegn   - inkluder spesialtegn (standard: True)
    """
    teiknsett = string.ascii_lowercase  # alltid med små bokstavar

    if store_bokstavar:
        teiknsett += string.ascii_uppercase
    if tal:
        teiknsett += string.digits
    if spesialtegn:
        teiknsett += string.punctuation

    passord = "".join(random.choices(teiknsett, k=lengde))
    return passord


def main():
    print("=== Passordgenerator ===\n")

    try:
        lengde = int(input("Kor langt skal passordet vere? (standard 12): ") or 12)
    except ValueError:
        lengde = 12

    store   = input("Inkluder store bokstavar? (j/n, standard j): ").strip().lower() != "n"
    tal     = input("Inkluder tal?             (j/n, standard j): ").strip().lower() != "n"
    spesial = input("Inkluder spesialtegn?     (j/n, standard j): ").strip().lower() != "n"

    print("\nGenererte passord:")
    for i in range(5):
        pw = generer_passord(lengde, store, tal, spesial)
        print(f"  {i+1}. {pw}")

    print("\nTips: Vel eitt av passorda over og lagre det i ein passordhandsamar.")


if __name__ == "__main__":
    main()
