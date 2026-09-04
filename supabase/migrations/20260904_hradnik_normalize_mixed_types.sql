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
  ELSIF NEW.kind = 'Hrad' AND (c = 'tvrz' OR c ~ 'hrad/tvrz') THEN
    NEW.kind := 'Tvrz';
  ELSIF NEW.kind = 'Hrad' AND c ~ 'hrad \(komenda\)' THEN
    NEW.kind := 'Klášter';
  ELSIF NEW.kind = 'Hrad' AND c ~ 'opevněný kostel' THEN
    NEW.kind := 'Opevněné místo';
  ELSIF NEW.kind = 'Hrad' AND c ~ '(hrad.*přestavěn.*zámek|přestavěný hrad/zámek)' THEN
    NEW.kind := 'Zámek';
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.hradnik_places
SET kind = CASE
  WHEN lower(coalesce(character,'')) ~ 'hrad/tvrz' THEN 'Tvrz'
  WHEN lower(coalesce(character,'')) ~ 'hrad \(komenda\)' THEN 'Klášter'
  WHEN lower(coalesce(character,'')) ~ 'opevněný kostel' THEN 'Opevněné místo'
  ELSE kind
END
WHERE kind='Hrad';
