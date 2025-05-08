alter table "public"."analysis_results" alter column "quality_score" set default '0'::real;

alter table "public"."analysis_results" alter column "quality_score" set data type real using "quality_score"::real;

alter table "public"."analysis_results" alter column "safety_level" set default '1'::real;

alter table "public"."analysis_results" alter column "safety_level" set data type real using "safety_level"::real;

alter table "public"."analysis_results" alter column "sentiment" set default '0'::real;

alter table "public"."analysis_results" alter column "sentiment" set data type real using "sentiment"::real;


