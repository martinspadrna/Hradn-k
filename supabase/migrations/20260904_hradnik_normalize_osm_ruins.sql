CREATE OR REPLACE FUNCTION public.hradnik_force_ruin_kind()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  c text := lower(coalesce(NEW.character,''));
  n text := lower(coalesce(NEW.name,''));
BEGIN
  IF NEW.kind = 'Hrad' AND (
    n ~ '(zřícen|zricen|ruin|trosk)'
    OR c ~ '(zřícen|zricen|ruin|trosk)'
    OR c ~ 'castle rem'
    OR c = 'castle yes'
    OR c ~ 'pozůstatky po .*hradu'
  ) THEN
    NEW.kind := 'Zřícenina';
  ELSIF NEW.kind = 'Hrad' AND c ~ '^tvrz$' THEN
    NEW.kind := 'Tvrz';
  ELSIF NEW.kind = 'Hrad' AND c ~ '(hrad.*přestavěn.*zámek|přestavěný hrad/zámek)' THEN
    NEW.kind := 'Zámek';
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.hradnik_places
SET kind='Zřícenina'
WHERE kind='Hrad' AND (
  lower(coalesce(character,''))='castle yes'
  OR lower(coalesce(character,'')) ~ 'castle rem'
);
