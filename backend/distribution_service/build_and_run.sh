#!/bin/bash
# build_and_run.sh - Скрипт для сборки и запуска сервиса распределения

set -e  # Выход при ошибке

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$SCRIPT_DIR/build"
BUILD_TYPE="${1:-Release}"  # Release или Debug

echo "================================"
echo "Distribution Service Build Script"
echo "================================"
echo ""

# 1. Проверить требования
echo "✓ Checking dependencies..."

command -v cmake > /dev/null 2>&1 || { echo "✗ CMake not found. Install it first."; exit 1; }
command -v make > /dev/null 2>&1 || { echo "✗ Make not found. Install it first."; exit 1; }

echo "  - CMake: $(cmake --version | head -1)"
echo "  - Make: $(make --version | head -1)"
echo ""

# 2. Создать директорию сборки
echo "✓ Creating build directory..."
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
echo "  - Build directory: $BUILD_DIR"
echo ""

# 3. Запустить CMake
echo "✓ Running CMake (Build type: $BUILD_TYPE)..."
cmake -DCMAKE_BUILD_TYPE="$BUILD_TYPE" ..
echo ""

# 4. Собрать проект
echo "✓ Building project..."
cmake --build . --config "$BUILD_TYPE" -j$(nproc)
echo ""

# 5. Проверить успех сборки
if [ -f "./distribution_service" ]; then
    echo "✓ Build successful!"
    echo ""
    echo "Executable: $BUILD_DIR/distribution_service"
    echo ""
    echo "Next steps:"
    echo "  1. Configure: edit config/distribution_service.json"
    echo "  2. Run: ./build/distribution_service"
    echo "  3. Test: curl http://localhost:8080/api/distribution/status"
    echo ""
else
    echo "✗ Build failed! Executable not found."
    exit 1
fi
