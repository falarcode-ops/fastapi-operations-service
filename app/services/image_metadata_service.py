import io
from PIL import Image

def sanitize_image_metadata(image_bytes: bytes, filename: str) -> bytes:
    """
    Sanea metadatos C2PA, XMP y EXIF en imágenes para evitar marcas de agua o insignias
    automatizadas en redes sociales (como LinkedIn y Meta).
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(list(img.getdata()))
        
        output = io.BytesIO()
        fmt = img.format if img.format else ("PNG" if filename.lower().endswith(".png") else "JPEG")
        
        if fmt.upper() in ["JPEG", "JPG"]:
            clean_img.save(output, format="JPEG", quality=95, optimize=True)
        elif fmt.upper() == "PNG":
            clean_img.save(output, format="PNG", optimize=True)
        elif fmt.upper() == "WEBP":
            clean_img.save(output, format="WEBP", quality=95)
        else:
            clean_img.save(output, format=fmt)
            
        return output.getvalue()
    except Exception:
        # En caso de error de decodificación, retornar bytes originales
        return image_bytes
