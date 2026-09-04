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
    OR c ~ 'castle rem+ants?'
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
SET kind = CASE
  WHEN kind='Hrad' AND (
    lower(coalesce(name,'')) ~ '(zřícen|zricen|ruin|trosk)'
    OR lower(coalesce(character,'')) ~ '(zřícen|zricen|ruin|trosk)'
    OR lower(coalesce(character,'')) ~ 'castle rem+ants?'
    OR lower(coalesce(character,'')) ~ 'pozůstatky po .*hradu'
  ) THEN 'Zřícenina'
  WHEN kind='Hrad' AND lower(coalesce(character,'')) ~ '^tvrz$' THEN 'Tvrz'
  WHEN kind='Hrad' AND lower(coalesce(character,'')) ~ '(hrad.*přestavěn.*zámek|přestavěný hrad/zámek)' THEN 'Zámek'
  ELSE kind
END
WHERE kind='Hrad';
