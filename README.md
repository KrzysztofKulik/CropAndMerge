# Crop and Merge - Edytor Obrazów

Aplikacja webowa do edycji i łączenia obrazów PNG, przeznaczona do wdrożenia na AWS Elastic Beanstalk.

## Funkcjonalności

- **Wczytywanie obrazów**: Obsługa formatów PNG, JPG, JPEG, GIF
- **Obraz bazowy**: Pierwszy obraz służy jako tło
- **Obraz nakładany**: Drugi obraz jest umieszczany na pierwszym planie
- **Edycja obrazu nakładanego**:
  - Przesuwanie w poziomie i pionie
  - Skalowanie (10% - 300%)
  - Podgląd w czasie rzeczywistym
- **Eksport**: Pobieranie połączonego obrazu w formacie PNG
- **Zachowanie rozmiarów**: Końcowy obraz ma takie same wymiary jak obraz bazowy

## Struktura projektu

```
CropAndMerge/
├── app.py                 # Główna aplikacja Flask
├── requirements.txt       # Zależności Python
├── .ebextensions/        # Konfiguracja AWS Beanstalk
│   └── python.config
├── templates/
│   └── index.html        # Szablon HTML
├── static/
│   ├── css/
│   │   └── style.css     # Style CSS
│   └── js/
│       └── app.js        # JavaScript frontend
├── uploads/              # Folder na przesłane pliki (tworzone automatycznie)
└── temp/                 # Folder na pliki tymczasowe (tworzone automatycznie)
```

## Uruchomienie lokalnie

1. Zainstaluj zależności:
```bash
pip install -r requirements.txt
```

2. Uruchom aplikację:
```bash
python app.py
```

3. Otwórz przeglądarkę i przejdź do `http://localhost:5000`

## Wdrożenie na AWS Elastic Beanstalk

### Wymagania
- Konto AWS
- AWS CLI skonfigurowane
- EB CLI zainstalowane

### Kroki wdrożenia

1. **Inicjalizacja projektu Elastic Beanstalk**:
```bash
cd CropAndMerge
eb init -p python-3.9 crop-and-merge-app
```

2. **Utworzenie środowiska**:
```bash
eb create crop-and-merge-env
```

3. **Wdrożenie aplikacji**:
```bash
eb deploy
```

4. **Otwórz aplikację**:
```bash
eb open
```

### Konfiguracja środowiska

Aplikacja automatycznie konfiguruje się dla środowiska produkcyjnego:
- Port jest pobierany z zmiennej środowiskowej `PORT`
- Host ustawiony na `0.0.0.0` dla dostępności publicznej
- Obsługa plików statycznych przez Elastic Beanstalk

### Monitorowanie

- **Health check endpoint**: `/health`
- **Logi**: Dostępne przez AWS Console lub `eb logs`

## Użytkowanie

1. **Wczytaj obraz bazowy**: Kliknij "Wybierz obraz bazowy" i wybierz plik
2. **Wczytaj obraz nakładany**: Kliknij "Wybierz obraz do nakładania" i wybierz drugi plik
3. **Edytuj pozycję**: Użyj suwaków do ustawienia pozycji X, Y
4. **Skaluj obraz**: Użyj suwaka skali do zmiany rozmiaru obrazu nakładanego
5. **Podgląd**: Kliknij "Zaktualizuj Podgląd" aby zobaczyć efekt
6. **Pobierz**: Kliknij "Połącz i Pobierz" aby zapisać końcowy obraz

## Limity

- Maksymalny rozmiar pliku: 16MB
- Obsługiwane formaty: PNG, JPG, JPEG, GIF
- Końcowy obraz jest zawsze w formacie PNG

## Bezpieczeństwo

- Walidacja typów plików
- Bezpieczne nazwy plików
- Automatyczne czyszczenie plików tymczasowych
- Unikalne identyfikatory dla każdego przesłanego pliku

## Technologie

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Przetwarzanie obrazów**: Pillow (PIL)
- **Hosting**: AWS Elastic Beanstalk